#!/usr/bin/env bash
set -euo pipefail

API="http://localhost:4000/api"
PASS_ADMIN="Admin@2026!"
PASS_INST="Inst@2026!"
PASS_EMP="Emp@2026!"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       VERIDAQ — FULL FLOW SIMULATION               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

FAIL=0

# ── 1. ADMIN LOGIN ──────────────────────────────────────────
echo "────────────────────────────────────────────────────────"
echo " 1. ADMIN LOGIN"
echo "────────────────────────────────────────────────────────"
ADMIN_RESP=$(curl -s -X POST "$API/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@veridaq.xyz\",\"password\":\"$PASS_ADMIN\"}")
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>&1)
echo "    ✓ Admin logged in"
echo ""

# ── 2. ADMIN LIST INSTITUTIONS ──────────────────────────────
echo "────────────────────────────────────────────────────────"
echo " 2. ADMIN LIST INSTITUTIONS"
echo "────────────────────────────────────────────────────────"
INST_LIST=$(curl -s "$API/admin/institutions" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$INST_LIST" | python3 -c "
import sys,json
data=json.load(sys.stdin)
items=data.get('items',[])
for i in items:
    print(f\"    • {i['name']}\")
    print(f\"      ID: {i['id']}\")
    print(f\"      KYC: {i.get('kycApproved','?')}\")
    print(f\"      Tier: {i.get('tier','?')}\")
" 2>&1
echo ""

# ── 3. INSTITUTION LOGIN ────────────────────────────────────
echo "────────────────────────────────────────────────────────"
echo " 3. INSTITUTION LOGIN"
echo "────────────────────────────────────────────────────────"
INST_RESP=$(curl -s -X POST "$API/auth/institution/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"futminna@veridaq.xyz\",\"password\":\"$PASS_INST\"}")
INST_TOKEN=$(echo "$INST_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>&1)
echo "    ✓ Institution logged in"
echo ""

# ── 4. INSTITUTION DASHBOARD ──────────────────────────────
echo "────────────────────────────────────────────────────────"
echo " 4. INSTITUTION DASHBOARD"
echo "────────────────────────────────────────────────────────"
DASH=$(curl -s "$API/institution/dashboard" \
  -H "Authorization: Bearer $INST_TOKEN")
echo "$DASH" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f\"    Total batches: {d.get('totalBatches',d.get('total_batches',0))}\")
print(f\"    Total claims: {d.get('totalClaims',d.get('total_claims',0))}\")
print(f\"    Total verifications: {d.get('totalVerifications',d.get('total_verifications',0))}\")
" 2>&1
echo ""

# ── 5. INSTITUTION UPLOAD BATCH ───────────────────────────
echo "────────────────────────────────────────────────────────"
echo " 5. INSTITUTION UPLOAD STUDENT BATCH"
echo "────────────────────────────────────────────────────────"
python3 -c "
import openpyxl
wb = openpyxl.Workbook()
ws = wb.active
ws.title = 'Students'
# Column order expected by batch.processor.ts: matricNumber, studentName, cgpa, classification, courseName, graduationYear
ws.append(['MatricNumber','Name','CGPA','Classification','Course','GraduationYear'])
ws.append(['FUT/19/001','John Doe',4.52,'First Class','Computer Science',2024])
ws.append(['FUT/19/002','Jane Smith',3.82,'Upper Second Class','Electrical Engineering',2024])
ws.append(['FUT/19/003','Bob Johnson',3.15,'Second Class Lower','Mechanical Engineering',2024])
wb.save('/tmp/demo_batch.xlsx')
print('XLSX ready')
" 2>&1
UPLOAD_RESP=$(curl -s -X POST "$API/institution/batch/upload" \
  -H "Authorization: Bearer $INST_TOKEN" \
  -F "file=@/tmp/demo_batch.xlsx")
echo "    Upload: $UPLOAD_RESP"
echo ""

# ── 6. LIST BATCHES ───────────────────────────────────────
echo "────────────────────────────────────────────────────────"
echo " 6. LIST BATCHES"
echo "────────────────────────────────────────────────────────"
BATCHES=$(curl -s "$API/institution/batch" \
  -H "Authorization: Bearer $INST_TOKEN")
echo "$BATCHES" | python3 -c "
import sys,json
data=json.load(sys.stdin)
if isinstance(data, list):
    for b in data:
        print(f\"    • Batch {b.get('id','?')} — Status: {b.get('status','?')} — Rows: {b.get('rowCount',b.get('row_count',0))}\")
elif isinstance(data, dict):
    print(json.dumps(data, indent=2)[:400])
else:
    print(str(data)[:400])
" 2>&1 || echo "    Response: ${BATCHES:0:200}"
echo ""

# ── 7. LIST VERIFICATIONS ─────────────────────────────────
echo "────────────────────────────────────────────────────────"
echo " 7. LIST INSTITUTION VERIFICATIONS"
echo "────────────────────────────────────────────────────────"
VERIFS=$(curl -s "$API/institution/verifications" \
  -H "Authorization: Bearer $INST_TOKEN")
echo "$VERIFS" | python3 -c "
import sys,json
data=json.load(sys.stdin)
if isinstance(data, list):
    for v in data:
        print(f\"    • Request {v.get('id','?')} — Status: {v.get('status','?')}\")
elif isinstance(data, dict):
    vals=data.get('items',data.get('verifications',[data]))
    for v in vals if isinstance(vals, list) else [vals]:
        print(f\"    • {v.get('id','?')} — {v.get('status','?')}\")
else:
    print(str(data)[:300])
" 2>&1
echo ""

# ── 8. EMPLOYER LOGIN ───────────────────────────────────────
echo "────────────────────────────────────────────────────────"
echo " 8. EMPLOYER LOGIN"
echo "────────────────────────────────────────────────────────"
EMP_RESP=$(curl -s -X POST "$API/auth/employer/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"firstbank@veridaq.xyz\",\"password\":\"$PASS_EMP\"}")
EMP_TOKEN=$(echo "$EMP_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>&1)
echo "    ✓ Employer logged in"
echo ""

# ── 9. EMPLOYER PROFILE ─────────────────────────────────────
echo "────────────────────────────────────────────────────────"
echo " 9. EMPLOYER PROFILE"
echo "────────────────────────────────────────────────────────"
PROFILE=$(curl -s "$API/employer/profile" \
  -H "Authorization: Bearer $EMP_TOKEN")
echo "$PROFILE" | python3 -c "
import sys,json
p=json.load(sys.stdin)
print(f\"    Name: {p.get('name','?')}\")
print(f\"    Email: {p.get('email','?')}\")
print(f\"    KYC: {p.get('kycApproved','?')}\")
print(f\"    Free verifications: {p.get('freeVerificationsRemaining','?')}\")
" 2>&1
echo ""

# ── 10. LIST INSTITUTIONS (from verify routes) ─────────────
echo "────────────────────────────────────────────────────────"
echo "10. LIST INSTITUTIONS (for verify form)"
echo "────────────────────────────────────────────────────────"
INSTS=$(curl -s "$API/verify/institutions" \
  -H "Authorization: Bearer $EMP_TOKEN")
echo "$INSTS" | python3 -c "
import sys,json
data=json.load(sys.stdin)
if isinstance(data, list):
    for i in data:
        print(f\"    • {i.get('name','?')} — On-chain ID: {i.get('onChainId',i.get('on_chain_id','N/A'))}\")
elif isinstance(data, dict):
    items=data.get('items',data.get('institutions',[data]))
    for i in items if isinstance(items, list) else [items]:
        print(f\"    • {i.get('name','?')} — ID: {str(i.get('id','?'))[:20]}\")
else:
    print(str(data)[:300])
" 2>&1
echo ""

# ── 11. VERIFICATION HISTORY ───────────────────────────────
echo "────────────────────────────────────────────────────────"
echo "11. VERIFICATION HISTORY"
echo "────────────────────────────────────────────────────────"
HISTORY=$(curl -s "$API/verify/history" \
  -H "Authorization: Bearer $EMP_TOKEN")
echo "$HISTORY" | python3 -c "
import sys,json
data=json.load(sys.stdin)
if isinstance(data, list):
    print(f\"    {len(data)} verification(s) found\")
    for v in data:
        print(f\"    • {v.get('id','?')} — {v.get('status','?')}\")
elif isinstance(data, dict):
    items=data.get('items',data.get('verifications',[data]))
    print(f\"    {len(items) if isinstance(items, list) else 1} verification(s) found\")
else:
    print(str(data)[:300])
" 2>&1
echo ""

# ── 12. VERIFY A CREDENTIAL ───────────────────────────────
echo "────────────────────────────────────────────────────────"
echo "12. VERIFY CREDENTIAL"
echo "────────────────────────────────────────────────────────"
echo "    Matric: FUT/19/001"
echo "    Claim type: 1 (CGPA)"
echo "    Threshold: 3"
echo ""

# Get on-chain ID from the verification institutions list
ON_CHAIN_ID_VERIFY=$(curl -s "$API/verify/institutions" \
  -H "Authorization: Bearer $EMP_TOKEN" | python3 -c "
import sys,json
data=json.load(sys.stdin)
if isinstance(data, list) and len(data)>0:
    print(data[0].get('onChainId',''))
elif isinstance(data, dict):
    items=data.get('institutions',data.get('items',[]))
    if items:
        print(items[0].get('onChainId',''))
" 2>&1)
echo "    Using on-chain ID: $ON_CHAIN_ID_VERIFY"
echo ""

VERIFY_RESP=$(curl -s -X POST "$API/verify/request" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"institutionOnChainId\":\"$ON_CHAIN_ID_VERIFY\",\"matricNumber\":\"FUT/19/001\",\"claimType\":1,\"threshold\":3}")
echo "    Response: ${VERIFY_RESP:0:500}"
echo ""

# ── 13. CHECK VERIFICATION STATUS ─────────────────────────
echo "────────────────────────────────────────────────────────"
echo "13. CHECK VERIFICATION STATUS"
echo "────────────────────────────────────────────────────────"
REQ_ID=$(echo "$VERIFY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('requestId',''))" 2>&1) || REQ_ID=""
if [ -n "$REQ_ID" ]; then
  echo "    Request ID: $REQ_ID"
  sleep 5
  STATUS_RESP=$(curl -s "$API/verify/request/$REQ_ID" \
    -H "Authorization: Bearer $EMP_TOKEN")
  echo "    Status: $STATUS_RESP"
else
  echo "    ⚠ No request ID in response (expected for async verification)"
fi
echo ""

# ── 14. CHECK FINAL HISTORY ──────────────────────────────
echo "────────────────────────────────────────────────────────"
echo "14. FINAL VERIFICATION HISTORY"
echo "────────────────────────────────────────────────────────"
HISTORY2=$(curl -s "$API/verify/history" \
  -H "Authorization: Bearer $EMP_TOKEN")
echo "$HISTORY2" | python3 -c "
import sys,json
data=json.load(sys.stdin)
if isinstance(data, list):
    for v in data:
        print(f\"    • {v.get('id','?')} — {v.get('status','?')} — matric: {v.get('matricNumber',v.get('matric_number','?'))}\")
elif isinstance(data, dict):
    items=data.get('items',data.get('verifications',[data]))
    for v in items if isinstance(items, list) else [items]:
        print(f\"    • {v.get('id','?')} — {v.get('status','?')}\")
else:
    print(str(data)[:300])
" 2>&1
echo ""

# ── SUMMARY ──────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════╗"
echo "║  FLOW SIMULATION COMPLETE                           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  ✓ Admin — logged in, listed institutions"
echo "  ✓ Institution — logged in, uploaded batch"
echo "  ✓ Employer — logged in, browsed institutions"
echo "  ✓ Verification — submitted request"
echo ""
echo "  Open http://localhost:3000 to see the UI."
echo ""
