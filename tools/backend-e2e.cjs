/**
 * End-to-end test via the backend:
 * 1. Encrypt test credential data matching the proof's private inputs
 * 2. Insert credential in DB
 * 3. Login as employer
 * 4. Create verification request
 * 5. Wait for result
 */
const { createCipheriv, randomBytes } = require('crypto');
const { Client } = require('pg');

const ENCRYPTION_KEY = Buffer.from('8fc4a34ea583018208afbf4581630e9d1eb6999a6e0715b0ee83126fe1a1cbd3', 'hex');
const ALGORITHM = 'aes-256-gcm';

function encrypt(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encryptedData: encrypted.toString('hex'),
    encryptedIv: iv.toString('hex'),
    encryptedTag: cipher.getAuthTag().toString('hex'),
  };
}

async function main() {
  // Test data matching the proof inputs
  const attrs = {
    nameHash: '12345678901234567890',
    matricHash: '98765432109876543210',
    cgpa: 450,
    classification: 4,
    courseHash: '42',
    graduationYear: 2024,
    blindingFactor: '131176846728483336645795122583996497135',
  };
  const plaintext = JSON.stringify(attrs);

  // Encrypt using the backend's key
  const { encryptedData, encryptedIv, encryptedTag } = encrypt(plaintext);
  console.log('Encrypted credential data:');
  console.log('  encryptedData:', encryptedData);
  console.log('  encryptedIv:', encryptedIv);
  console.log('  encryptedTag:', encryptedTag);

  // Connect to DB
  const client = new Client({
    connectionString: 'postgresql://veridaq:veridaq_dev@localhost:5432/veridaq',
  });
  await client.connect();

  // Get institution
  const instRes = await client.query("SELECT id FROM institutions WHERE email = 'futminna@veridaq.xyz' LIMIT 1");
  const instId = instRes.rows[0].id;
  console.log('Institution ID:', instId);

  // Get batch
  const batchRes = await client.query("SELECT id FROM batches LIMIT 1");
  const batchId = batchRes.rows[0].id;
  console.log('Batch ID:', batchId);

  // Insert credential
  await client.query(`
    INSERT INTO credentials (id, "batchId", "institutionId", commitment, nullifier, "encryptedData", "encryptedIv", "encryptedTag", "graduationYear", status, "createdAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 2024, 'ACTIVE', NOW())
  `, [
    'cred-e2e-' + Date.now(), batchId, instId,
    '17115030100254532267648309071401310466357894472184601553300178720436852733331',
    '15314947562268730416633216030537926151434238310733392013896009339959185201688',
    encryptedData, encryptedIv, encryptedTag,
  ]);
  console.log('Credential inserted');

  // Employer login
  const loginRes = await fetch('http://localhost:4000/api/auth/employer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'firstbank@veridaq.xyz', password: 'Emp@2026!' }),
  });
  const loginData = await loginRes.json();
  console.log('Login status:', loginRes.status);
  // Get cookie
  const setCookie = loginRes.headers.get('set-cookie');
  console.log('Cookie:', setCookie ? setCookie.split(';')[0] + '...' : 'none');

  if (!setCookie) { console.error('Login failed'); process.exit(1); }

  // Extract access_token
  const accessToken = setCookie.split(';').find(c => c.trim().startsWith('access_token='));
  if (!accessToken) { console.error('No access token cookie'); process.exit(1); }
  const token = accessToken.split('=')[1];
  console.log('Token:', token.substring(0, 20) + '...');

  // Create verification request
  // Need: institutionOnChainId, matricNumber, claimType, threshold
  // Institution on-chain ID is 0x6675746d696e6e61000000000000000000000000000000000000000000000000
  // (which is "futminna" padded to 32 bytes)
  const verifyRes = await fetch('http://localhost:4000/api/verification/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `access_token=${token}`,
    },
    body: JSON.stringify({
      institutionOnChainId: '0x6675746d696e6e61000000000000000000000000000000000000000000000000',
      matricNumber: '9876543210',
      claimType: 4,
      threshold: 0,
    }),
  });
  const verifyData = await verifyRes.json();
  console.log('Verification request status:', verifyRes.status);
  console.log('Verify response:', JSON.stringify(verifyData, null, 2));

  if (verifyData.requestId) {
    // Poll for result
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`http://localhost:4000/api/verification/request/${verifyData.requestId}`, {
        headers: { 'Cookie': `access_token=${token}` },
      });
      const statusData = await statusRes.json();
      console.log(`Poll #${i + 1}:`, JSON.stringify(statusData));
      if (statusData.status === 'COMPLETED' || statusData.status === 'FAILED') break;
    }
  }

  await client.end();
}

main().catch(e => { console.error('FAILED:', e); process.exit(1); });
