/**
 * Wyoming Protocol Server
 * TCP server implementing Wyoming STT protocol
 */

import * as net from 'net';
import { logger } from './logging';
import { WyomingMessage, WyomingInfoMessage } from './types';

export function createWyomingServer(): net.Server {
  const server = net.createServer((socket) => {
    logger.info('Wyoming client connected', { 
      remoteAddress: socket.remoteAddress,
      remotePort: socket.remotePort 
    });

    socket.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString().trim()) as WyomingMessage;
        handleWyomingMessage(socket, message);
      } catch (error) {
        sendError(socket, 'Invalid JSON message');
      }
    });

    socket.on('close', () => {
      logger.info('Wyoming client disconnected');
    });

    socket.on('error', (error) => {
      logger.error('Wyoming socket error', { error: error.message });
    });
  });

  return server;
}

function handleWyomingMessage(socket: net.Socket, message: WyomingMessage): void {
  switch (message.type) {
    case 'describe':
      sendServiceInfo(socket);
      break;
    case 'transcribe':
      // Start transcription session
      break;
    case 'audio-start':
      validateAudioStart(socket, message);
      break;
    case 'audio-chunk':
      // Process audio chunk
      break;
    case 'audio-stop':
      sendTranscript(socket);
      break;
    default:
      sendError(socket, `Unknown message type: ${message.type}`);
  }
}

function sendServiceInfo(socket: net.Socket): void {
  const info: WyomingInfoMessage = {
    type: 'info',
    data: {
      stt: [{
        name: 'openai-realtime',
        description: 'OpenAI Realtime voice service with HA integration',
        installed: true,
        languages: ['en-US', 'de-DE', 'es-ES', 'fr-FR'],
        version: '1.0.0',
      }]
    }
  };

  socket.write(JSON.stringify(info) + '\n');
}

function validateAudioStart(socket: net.Socket, message: WyomingMessage): void {
  const data = message.data as any;
  if (data?.rate !== 16000) {
    sendError(socket, 'Only 16kHz sample rate supported');
    return;
  }
  if (data?.width !== 16) {
    sendError(socket, 'Only 16-bit audio supported');
    return;
  }
}

function sendTranscript(socket: net.Socket): void {
  const transcript = {
    type: 'transcript',
    data: {
      text: 'Turn on the living room lights',
      confidence: 0.95,
      language: 'en-US',
    }
  };

  socket.write(JSON.stringify(transcript) + '\n');
}

function sendError(socket: net.Socket, message: string): void {
  const error = {
    type: 'error',
    data: {
      code: 'audio-error',
      message,
    }
  };

  socket.write(JSON.stringify(error) + '\n');
}
