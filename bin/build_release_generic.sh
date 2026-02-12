#!/bin/bash
set -euo pipefail

. ./bin/utils.sh

header "Preparing frontend release for embedding into contract canister"
npm ci --omit=optional
npm i --save-dev @rollup/rollup-linux-x64-gnu
npm run build

export LOCKED=--locked

header "Generating wasm"
./bin/generate_wasm.sh
./bin/compress_wasm.sh
