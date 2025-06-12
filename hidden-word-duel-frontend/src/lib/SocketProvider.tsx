'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: (playerId: string, username: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connect: () => {},
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  // Use a ref to hold the socket instance. This is key to preventing re-renders.
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback((playerId: string, username: string) => {
    // If socket is already created, don't do anything.
    if (socketRef.current) {
      return;
    }

    console.log(`SocketProvider: Creating socket for player ${playerId}`);
    const newSocket = io('http://localhost:3002', {
      auth: { playerId },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('SocketProvider: Connected!');
      setIsConnected(true);
      // Announce connection right away
      newSocket.emit('playerConnected', { id: playerId, username });
    });

    newSocket.on('disconnect', () => {
      console.log('SocketProvider: Disconnected.');
      setIsConnected(false);
    });
    
    // Store the new socket in the ref.
    socketRef.current = newSocket;

  }, []); // Empty dependency array means this function is created only ONCE.

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log("SocketProvider: Disconnecting socket on cleanup.")
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, connect }}>
      {children}
    </SocketContext.Provider>
  );
};