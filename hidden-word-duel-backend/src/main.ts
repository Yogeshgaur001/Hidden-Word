// filepath: c:\Users\asus\OneDrive\Desktop\Hidden Word\hidden-word-duel-backend\src\main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configure WebSocket adapter
  const ioAdapter = new IoAdapter(app);
  app.useWebSocketAdapter(ioAdapter);
  
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  });

  const ports = [3000, 3001, 3002];
  
  for (const port of ports) {
    try {
      await app.listen(port);
      console.log(`Server running on port ${port}`);
      console.log(`WebSocket server is ready`);
      break;
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
      console.log(`Port ${port} is in use, trying next port...`);
    }
  }
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});