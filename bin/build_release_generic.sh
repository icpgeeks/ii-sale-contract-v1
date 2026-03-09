#!/bin/bash
set -euo pipefail

. ./bin/utils.sh

header "Preparing frontend release for embedding into contract canister"
npm ci --omit=optional
npm i --save-dev @rollup/rollup-linux-x64-gnu

FRONTEND_VITE_MODE="${FRONTEND_BUILD_MODE}"
FRONTEND_TSCONFIG="tsconfig.${FRONTEND_BUILD_MODE}.json"

echo "Using FRONTEND_BUILD_MODE=$FRONTEND_BUILD_MODE => FRONTEND_TSCONFIG=$FRONTEND_TSCONFIG, FRONTEND_VITE_MODE=$FRONTEND_VITE_MODE"

export PATH="$PWD/node_modules/.bin:$PATH"
pushd frontend
tsc -p "$FRONTEND_TSCONFIG" && NODE_ENV=production vite build --mode "$FRONTEND_VITE_MODE"
popd

export LOCKED=--locked

header "Generating wasm"
./bin/generate_wasm.sh
./bin/compress_wasm.sh
