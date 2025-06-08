export interface AppConfig {
  port: number;
  allowedOrigins: string[];
  nodeEnv: string;
  game: {
    maxPlayersPerRoom: number;
    wordMinLength: number;
    wordMaxLength: number;
    maxGuesses: number;
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT || '3002', 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  nodeEnv: process.env.NODE_ENV || 'development',
  game: {
    maxPlayersPerRoom: parseInt(process.env.MAX_PLAYERS_PER_ROOM || '2', 10),
    wordMinLength: parseInt(process.env.WORD_MIN_LENGTH || '4', 10),
    wordMaxLength: parseInt(process.env.WORD_MAX_LENGTH || '8', 10),
    maxGuesses: parseInt(process.env.MAX_GUESSES || '6', 10),
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'hidden_word',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password',
  },
});