// src/socket-io.adapter.ts

import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

/**
 * This custom adapter ensures that the WebSocket server correctly handles
 * CORS settings, allowing your frontend (on localhost:3001) to connect
 * to your backend (on localhost:3000).
 */
export class SocketIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      // This is the crucial part that was missing.
      // We explicitly configure CORS here, which Socket.IO's underlying
      // HTTP server will use for the initial handshake requests.
      cors: {
        origin: 'http://localhost:3001', // Your frontend URL
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
    return server;
  }
}