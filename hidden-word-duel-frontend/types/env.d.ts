declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_WS_URL: string;
    NEXT_PUBLIC_APP_NAME: string;
    NEXT_PUBLIC_DEBUG?: string;
  }
}