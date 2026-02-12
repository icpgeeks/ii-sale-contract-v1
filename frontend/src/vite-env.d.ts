/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ViteTypeOptions {
    strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
    readonly VITE_APP_INTERNET_IDENTITY_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
