#!/usr/bin/env bash
# Compiles the credential Circom circuit.
# Prerequisites: circom installed globally (npm install -g circom or cargo install).
# Run from the workspace root: pnpm circuit:compile

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$CIRCUITS_DIR/build"

echo "Creating build directory..."
mkdir -p "$BUILD_DIR"

echo "Compiling credential.circom..."
circom "$CIRCUITS_DIR/credential.circom" \
  --r1cs \
  --wasm \
  --sym \
  --output "$BUILD_DIR" \
  --prime bn128

echo ""
echo "Compilation complete. Files in $BUILD_DIR:"
ls -lh "$BUILD_DIR"
echo ""
echo "Next step: run pnpm circuit:setup to perform the trusted setup."
