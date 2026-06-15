#!/usr/bin/env bash
set -euo pipefail

# VERIDAQ Soroban Contract Deploy Script
# Deploys all 3 contracts to Stellar testnet, initializes them, and prints .env values.
# Run from repo root: bash contracts/deploy.sh
#
# Prerequisites:
#   1. stellar CLI installed (v26.1.0+)
#   2. A funded Stellar identity: stellar keys generate veridaq-admin
#   3. Funded via friendbot: curl "https://friendbot.stellar.org?addr=$(stellar keys address veridaq-admin)"
#   4. Build WASM: cargo build --target wasm32v1-none --release -p institution-registry -p groth16-verifier -p veridaq-core

RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
NETWORK_PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
SOURCE="${STELLAR_SOURCE:-veridaq-admin}"
CONTRACTS_DIR="contracts/target/wasm32v1-none/release"
XLM_ASSET_ID="${XLM_ASSET_ID:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"
VK_HASH="0000000000000000000000000000000000000000000000000000000000000001"

# Zero G1/G2 points for mock VK
Z64="00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
Z128="0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"

ADMIN_KEY=$(stellar keys address "$SOURCE" 2>/dev/null) || { echo "ERROR: Source '$SOURCE' not found. Run: stellar keys generate $SOURCE"; exit 1; }

echo "=== VERIDAQ Contract Deployment ==="
echo "RPC URL:      $RPC_URL"
echo "Network:      $NETWORK_PASSPHRASE"
echo "Source:       $SOURCE"
echo "Admin:        $ADMIN_KEY"
echo ""

deploy() {
  local name="$1"
  local wasm_file="$2"
  local alias="$3"
  echo "Deploying $name..."

  # Check if already deployed
  local existing
  existing=$(stellar contract list --source-account "$SOURCE" --rpc-url "$RPC_URL" --network-passphrase "$NETWORK_PASSPHRASE" 2>/dev/null | grep "$alias" || true)
  if [ -n "$existing" ]; then
    echo "  Already deployed, skipping..."
    return
  fi

  local result
  result=$(stellar contract deploy \
    --wasm "$wasm_file" \
    --alias "$alias" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    --source-account "$SOURCE" 2>&1)

  local contract_id
  contract_id=$(echo "$result" | grep "✅ Deployed" -A1 | tail -1 | tr -d '[:space:]')
  if [ -z "$contract_id" ]; then
    # Try to extract from the lab.stellar.org link
    contract_id=$(echo "$result" | grep -oP 'contract/[A-Z0-9]+' | head -1 | sed 's/contract\///')
  fi
  echo "  Contract ID: $contract_id"
  echo ""
  eval "DEPLOYED_${name}_ID=$contract_id"
}

invoke_init() {
  local id="$1"
  shift
  echo "  Initializing..."
  stellar contract invoke \
    --id "$id" \
    --source-account "$SOURCE" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    -- "$@" 2>&1 | grep -v "^$" || true
}

DEPLOYED_InstitutionRegistry_ID=""
DEPLOYED_Groth16Verifier_ID=""
DEPLOYED_VeridaqCore_ID=""

deploy "InstitutionRegistry" "$CONTRACTS_DIR/institution_registry.wasm" "institution-registry"
deploy "Groth16Verifier" "$CONTRACTS_DIR/groth16_verifier.wasm" "groth16-verifier"
deploy "VeridaqCore" "$CONTRACTS_DIR/veridaq_core.wasm" "veridaq-core"

echo ""
echo "=== Initializing Contracts ==="
echo ""

echo "1/3 InstitutionRegistry..."
INIT_ID="${DEPLOYED_InstitutionRegistry_ID:-CCPAEN4LD373FMVDIM6YOTEUXFR3TV3DMFIUHFT2GXL3CO2VEFZBNAJW}"
invoke_init "$INIT_ID" initialize --admin "$ADMIN_KEY"

echo "2/3 Groth16Verifier..."
VER_ID="${DEPLOYED_Groth16Verifier_ID:-CBDGIG7CFFG23VW5KQE4RACEKXNLR4EKAAWSETMXVEV4GGFXSHBTZSD6}"
invoke_init "$VER_ID" initialize --admin "$ADMIN_KEY"
echo "  Registering mock VK..."
stellar contract invoke \
  --id "$VER_ID" \
  --source-account "$SOURCE" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- register_vk \
  --caller "$ADMIN_KEY" \
  --vk_hash "$VK_HASH" \
  --vk "{ \"alpha\": \"$Z64\", \"beta\": \"$Z128\", \"gamma\": \"$Z128\", \"delta\": \"$Z128\", \"ic\": [\"$Z64\", \"$Z64\", \"$Z64\", \"$Z64\", \"$Z64\"] }" 2>&1 | grep -v "^$" || true

echo "3/3 VeridaqCore..."
CORE_ID="${DEPLOYED_VeridaqCore_ID:-CBKCRUJVROO46MQN26SKR3FEKUVK3LPYDGX3FWYJFESUDFIVOCKOCQDS}"
invoke_init "$CORE_ID" initialize \
  --admin "$ADMIN_KEY" \
  --institution_registry "$INIT_ID" \
  --groth16_verifier "$VER_ID" \
  --verifier_vk_hash "$VK_HASH" \
  --xlm_asset "$XLM_ASSET_ID"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Add these to your .env file:"
echo ""
echo "STELLAR_RPC_URL=$RPC_URL"
echo "STELLAR_NETWORK_PASSPHRASE=$NETWORK_PASSPHRASE"
echo "INSTITUTION_REGISTRY_ID=$INIT_ID"
echo "CREDENTIAL_REGISTRY_ID=$CORE_ID"
echo "REVOCATION_REGISTRY_ID=$CORE_ID"
echo "ZK_VERIFIER_ID=$VER_ID"
echo "XLM_ASSET_ID=$XLM_ASSET_ID"
echo "PLATFORM_ADMIN_SECRET_KEY=<get from: stellar keys show $SOURCE>"
echo "PLATFORM_ADMIN_PUBLIC_KEY=$ADMIN_KEY"
