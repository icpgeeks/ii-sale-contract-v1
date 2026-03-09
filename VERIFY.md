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
git checkout 1.1.0
```

2. Run the build script:

```bash
bin/repro-build-in-docker.sh
```

3. Check the last messages:

```bash
Built wasm hash and size:
target/release/reproducible/contract_canister_impl-opt.wasm a1d8296cc73c049962afafe4ac69724f967b63a25b3788b37a86ea685f4c0f78 - 7315002
```

4. Fetch the hash of the contract canister and compare it with the hash from the previous step:

```bash
dfx canister --ic info xxxxx-xxxxx-xxxxx-xxxxx-xxx
```
