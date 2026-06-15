#!/usr/bin/env bash
# Performs the Groth16 trusted setup for the credential circuit.
# This uses the Hermez powers-of-tau phase 1 ceremony output (ptau file).
# The ptau file is downloaded once; the circuit-specific phase 2 is computed here.
# Run from the workspace root: pnpm circuit:setup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$(cd "$SCRIPT_DIR/../build" && pwd)"

PTAU="$BUILD_DIR/powersOfTau28_hez_final_13.ptau"

if [ ! -f "$PTAU" ]; then
  echo "Downloading Hermez powers-of-tau file (supports circuits up to 2^13 constraints)..."
  curl -L -o "$PTAU" \
    "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_13.ptau"
fi

echo "Running Groth16 phase 2 setup for credential circuit..."
snarkjs groth16 setup \
  "$BUILD_DIR/credential.r1cs" \
  "$PTAU" \
  "$BUILD_DIR/credential_0000.zkey"

echo "Applying random beacon to finalise the setup..."
snarkjs zkey beacon \
  "$BUILD_DIR/credential_0000.zkey" \
  "$BUILD_DIR/credential_final.zkey" \
  "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f" \
  10 \
  -n="VERIDAQ Final Beacon"

echo "Exporting verification key..."
snarkjs zkey export verificationkey \
  "$BUILD_DIR/credential_final.zkey" \
  "$BUILD_DIR/verification_key.json"

echo "Exporting Solidity verifier contract..."
snarkjs zkey export solidityverifier \
  "$BUILD_DIR/credential_final.zkey" \
  "../../contracts/src/ZKVerifier.sol"

echo ""
echo "Setup complete. Key files:"
ls -lh "$BUILD_DIR"/*.zkey "$BUILD_DIR"/verification_key.json
echo ""
echo "IMPORTANT: Update .env with the paths to credential_final.zkey and"
echo "the credential_js/credential.wasm file in $BUILD_DIR."
echo ""
echo "Also deploy the new ZKVerifier.sol from packages/contracts/src/."
