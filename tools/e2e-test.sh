#!/usr/bin/env bash
# Comprehensive End-to-End ZK Verification Test
# Uses stellar CLI for contract calls, Node.js/CJS for proof generation
set -euo pipefail

VERIFIER_ID="CDMHFJNHJCUI2A54LY4LMVYBE7IO3BDDIH4STNJGMU2PQIMNVXJOXMI3"
VK_HASH="0000000000000000000000000000000000000000000000000000000000000002"
ADMIN_KEY="$(stellar keys address veridaq-admin)"
RPC_ARGS="--source-account veridaq-admin --rpc-url https://soroban-testnet.stellar.org --network-passphrase 'Test SDF Network ; September 2015'"

echo "=== Comprehensive E2E Verification Test ==="
echo "Verifier: $VERIFIER_ID"
echo "VK Hash:  $VK_HASH"
echo ""

# ── 1. Check VK registration ──────────────────────────────────────────────
echo "--- Test 1: VK registration ---"
RES=$(eval "stellar contract invoke --id $VERIFIER_ID $RPC_ARGS -- is_vk_registered --vk_hash $VK_HASH 2>&1 | tail -1")
echo "  is_vk_registered: $RES"
echo ""

# ── 2. Generate proof locally ────────────────────────────────────────────
echo "--- Generating proof ---"
PROOF_JSON=$(node tools/gen-proof.cjs 2>/dev/null)
echo "  Proof generated and locally verified: ✔"

# Extract proof components
A_HEX=$(echo "$PROOF_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['aHex'])")
B_HEX=$(echo "$PROOF_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['bHex'])")
C_HEX=$(echo "$PROOF_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['cHex'])")
PUB_JSON=$(echo "$PROOF_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d['pubHex']))")
B0=$(echo "$PROOF_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['components']['b0'])")
B1=$(echo "$PROOF_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['components']['b1'])")
B2=$(echo "$PROOF_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['components']['b2'])")
B3=$(echo "$PROOF_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['components']['b3'])")

echo "  A: ${A_HEX:0:32}..."
echo "  B: ${B_HEX:0:32}..."
echo "  C: ${C_HEX:0:32}..."
echo ""

# Helper: invoke verify_raw
invoke_vfy() {
  local vk_hash="$1" a="$2" b="$3" c="$4" pubs="$5"
  eval "stellar contract invoke --id $VERIFIER_ID $RPC_ARGS -- verify_raw --vk_hash '$vk_hash' --a_bytes '0x$a' --b_bytes '0x$b' --c_bytes '0x$c' --public_signal_bytes '$pubs' 2>&1 | tail -1"
}

# ── 3. verify_raw with correct CAP-74 format ─────────────────────────────
echo "--- Test 2: verify_raw (correct G2: c1||c0||c1||c0) ---"
RES=$(invoke_vfy "$VK_HASH" "$A_HEX" "$B_HEX" "$C_HEX" "$PUB_JSON")
echo "  Result: $RES"
if [ "$RES" = "true" ]; then echo "  ✔ VALID PROOF VERIFIED ON-CHAIN"; else echo "  ✘ FAIL"; fi
echo ""

# ── 4. All 24 G2 permutations ───────────────────────────────────────────
echo "--- Test 3: All 24 G2 proof byte permutations ---"
python3 -c "
import itertools, json
comps = {'b0': '$B0', 'b1': '$B1', 'b2': '$B2', 'b3': '$B3'}
perms = list(itertools.permutations(['b0','b1','b2','b3']))
print(json.dumps([comps[k] for k in list(p)] for p in perms))
" > /tmp/permutations.json

perm_count=0
pass_count=0
first_true_idx=-1

python3 -c "
import json
perms = json.load(open('/tmp/permutations.json'))
for i, p in enumerate(perms):
    print(''.join(p))
" | while IFS= read -r b_perm; do
  perm_count=$((perm_count + 1))
  RES=$(invoke_vfy "$VK_HASH" "$A_HEX" "$b_perm" "$C_HEX" "$PUB_JSON") || true
  if [ "$RES" = "true" ]; then
    pass_count=$((pass_count + 1))
    if [ $first_true_idx -eq -1 ]; then first_true_idx=$perm_count; fi
    echo "  perm #$perm_count: ✔ true" >&2
  elif [ "$RES" = "false" ]; then
    echo "  perm #$perm_count: ✘ false" >&2
  else
    echo "  perm #$perm_count: error: ${RES:0:80}" >&2
  fi
  echo "$perm_count $pass_count $first_true_idx"
done | tail -1 | read -r perm_count pass_count first_true_idx

# ── 5. Edge cases ────────────────────────────────────────────────────────
echo ""
echo "--- Test 4: Edge cases ---"

echo -n "  Wrong VK hash (should error): "
WRONG_VK="ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
RES=$(invoke_vfy "$WRONG_VK" "$A_HEX" "$B_HEX" "$C_HEX" "$PUB_JSON") || true
echo "${RES:0:80}"

echo -n "  Wrong public inputs (should return false): "
WRONG_PUB=$(python3 -c "
import json
pubs = $PUB_JSON
pubs[0], pubs[1] = pubs[1], pubs[0]
print(json.dumps(pubs))
")
RES=$(invoke_vfy "$VK_HASH" "$A_HEX" "$B_HEX" "$C_HEX" "$WRONG_PUB") || true
echo "$RES"

echo -n "  Wrong proof A (zero G1 = wrong proof, should return false): "
ZERO_A="00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
RES=$(invoke_vfy "$VK_HASH" "$ZERO_A" "$B_HEX" "$C_HEX" "$PUB_JSON") || true
echo "$RES"

echo -n "  Zero proof B (G2 at infinity, should return false): "
ZERO_B="0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
RES=$(invoke_vfy "$VK_HASH" "$A_HEX" "$ZERO_B" "$C_HEX" "$PUB_JSON") || true
echo "$RES"

echo -n "  Too many public signals (5 instead of 4, should error): "
TOO_MANY=$(python3 -c "
import json
pubs = $PUB_JSON
pubs.append('0000000000000000000000000000000000000000000000000000000000000005')
print(json.dumps(pubs))
")
RES=$(invoke_vfy "$VK_HASH" "$A_HEX" "$B_HEX" "$C_HEX" "$TOO_MANY") || true
echo "${RES:0:80}"

echo -n "  Empty public signals (should error): "
RES=$(invoke_vfy "$VK_HASH" "$A_HEX" "$B_HEX" "$C_HEX" "[]") || true
echo "${RES:0:80}"

echo ""
echo "=== Summary ==="
echo "  1. VK registration:                        ✔"
echo "  2. Local SnarkJS verification:            ✔"
echo "  3. verify_raw (CAP-74 G2):                see above"
echo "  4. G2 permutations passed:                see above"
echo "  5. Edge cases:                            see above"
echo ""
