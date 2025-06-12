// filepath: c:\Users\asus\OneDrive\Desktop\Hidden Word\hidden-word-duel-backend\src\main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SocketIoAdapter } from './socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Use custom Socket.IO adapter with proper CORS
  app.useWebSocketAdapter(new SocketIoAdapter(app));
  
  // Configure CORS for REST endpoints
  app.enableCors({
    origin: 'http://localhost:3000', // Frontend URL
    methods: ['GET', 'POST'],
    credentials: true,
  });

  const PORT = 3002;
  
  try {
    await app.listen(PORT);
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server is ready`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();