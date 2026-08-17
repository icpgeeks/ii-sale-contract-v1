FROM ubuntu:24.04

ENV RELEASE_MODULE=contract

ENV TZ=UTC

# Install the basic environment needed for our build tools.
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN apt -yq update
RUN apt -yq install --no-install-recommends curl ca-certificates build-essential pkg-config libssl-dev llvm-dev liblmdb-dev libunwind-dev clang cmake xz-utils

# Install Node.js from the official release archive.
ENV NODE_VERSION=24.11.1
ENV NODE_ARCHIVE_SHA256=60e3b0a8500819514aca603487c254298cd776de0698d3cd08f11dba5b8289a8
ENV PATH="/opt/node/bin:${PATH}"
RUN set -eux; \
    node_archive="node-v${NODE_VERSION}-linux-x64.tar.xz"; \
    curl --fail --location --silent --show-error --retry 5 --retry-all-errors --retry-delay 2 \
        "https://nodejs.org/dist/v${NODE_VERSION}/${node_archive}" \
        --output "/tmp/${node_archive}"; \
    echo "${NODE_ARCHIVE_SHA256}  /tmp/${node_archive}" | sha256sum --check --strict; \
    mkdir -p /opt/node; \
    tar --extract --xz --file "/tmp/${node_archive}" --directory /opt/node --strip-components=1; \
    rm "/tmp/${node_archive}"; \
    node --version; \
    npm --version

# Install Rust and Cargo
ENV RUSTUP_HOME=/opt/rustup
ENV CARGO_HOME=/opt/cargo
ENV RUST_VERSION=1.90.0
ENV PATH=/opt/cargo/bin:${PATH}
RUN curl --fail https://sh.rustup.rs -sSf \
    | sh -s -- -y --default-toolchain ${RUST_VERSION}-x86_64-unknown-linux-gnu --no-modify-path
RUN rustup default ${RUST_VERSION}-x86_64-unknown-linux-gnu
RUN rustup target add wasm32-unknown-unknown
RUN cargo install ic-wasm@0.9.11

# Install dfx
ENV DFX_VERSION=0.29.1
ENV DFXVM_INIT_YES=true
RUN curl -fsSL https://internetcomputer.org/install.sh | bash 

ENV PATH=/root/.local/share/dfx/bin:${PATH}

COPY --from=module / /canister
WORKDIR /canister

ENV RELEASE_DIR_PREFIX=target/wasm32-unknown-unknown/release
ENV RELEASE_FILE_PREFIX=$RELEASE_DIR_PREFIX/${RELEASE_MODULE}_canister_impl
ARG FRONTEND_BUILD_MODE=production
ARG RUSTFLAGS=
RUN bin/build_release_generic.sh
