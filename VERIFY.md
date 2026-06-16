# Verifying Releases

## Overview

Releases are built using a [reproducible build](https://docs.internetcomputer.org/building-apps/best-practices/reproducible-builds) script. The same script can be used to independently verify that the deployed canister contains the exact code published in the repository.

## Prerequisites

- Docker 28.2.2
- docker-buildx (on some systems it must be installed explicitly)
- [Lima](https://docs.internetcomputer.org/building-apps/best-practices/reproducible-builds#build-environments-using-docker) (if you are using macOS)

## Steps to verify

1. Check out the source code by release tag:

```bash
git checkout 1.4.0
```

2. Run the build script:

```bash
bin/repro-build-in-docker.sh
```

3. Check the last messages:

```bash
Built wasm hash and size:
target/release/reproducible/contract_canister_impl-opt.wasm 07e9532d0c292a024d3666e5952ce119aaa7750dfd8d6d99d4ad7e699648759e - 7415482
```

4. Fetch the hash of the contract canister and compare it with the hash from the previous step:

```bash
dfx canister --ic info xxxxx-xxxxx-xxxxx-xxxxx-xxx
```
