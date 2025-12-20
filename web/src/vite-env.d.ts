/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_JOHN_EMAIL: string
  readonly VITE_STEPH_EMAIL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
