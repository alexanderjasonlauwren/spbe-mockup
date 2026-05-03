/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // Add more env variables as needed
  readonly VITE_APP_TITLE?: string;
  readonly VITE_DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
