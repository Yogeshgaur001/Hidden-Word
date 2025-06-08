declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
      ALLOWED_ORIGINS?: string;
      MAX_PLAYERS_PER_ROOM?: string;
      WORD_MIN_LENGTH?: string;
      WORD_MAX_LENGTH?: string;
      MAX_GUESSES?: string;
      DB_HOST?: string;
      DB_PORT?: string;
      DB_NAME?: string;
      DB_USER?: string;
      DB_PASSWORD?: string;
    }
  }
}

export {};