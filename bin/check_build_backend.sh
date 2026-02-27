#!/bin/bash
set -euo pipefail

. ./bin/utils.sh

header "Ensuring factory stubs exist in target/"
DEV_DIR="./target"
mkdir -p "$DEV_DIR"
for stub in "$DEV_DIR/factory_local.rs" "$DEV_DIR/factory_test.rs"; do
    if [ ! -f "$stub" ]; then
        echo "// stub" > "$stub"
        echo "Created stub: $stub"
    fi
done

header "Cargo check"
cargo check

header "Cargo clippy"
cargo clippy

header "Cargo fmt"
cargo fmt

header "Cargo test"
cargo test --lib

./bin/generate_candid.sh
