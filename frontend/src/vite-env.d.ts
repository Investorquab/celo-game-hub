/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PLAYER_REGISTRY_CONTRACT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
