"use strict";
/**
 * Wyoming Protocol Server
 * TCP server implementing Wyoming STT protocol
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWyomingServer = createWyomingServer;
const net = __importStar(require("net"));
const logging_1 = require("./logging");
function createWyomingServer() {
    const server = net.createServer((socket) => {
        logging_1.logger.info('Wyoming client connected', {
            remoteAddress: socket.remoteAddress,
            remotePort: socket.remotePort
        });
        socket.on('data', (data) => {
            try {
                const message = JSON.parse(data.toString().trim());
                handleWyomingMessage(socket, message);
            }
            catch (error) {
                sendError(socket, 'Invalid JSON message');
            }
        });
        socket.on('close', () => {
            logging_1.logger.info('Wyoming client disconnected');
        });
        socket.on('error', (error) => {
            logging_1.logger.error('Wyoming socket error', { error: error.message });
        });
    });
    return server;
}
function handleWyomingMessage(socket, message) {
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
function sendServiceInfo(socket) {
    const info = {
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
function validateAudioStart(socket, message) {
    const data = message.data;
    if (data?.rate !== 16000) {
        sendError(socket, 'Only 16kHz sample rate supported');
        return;
    }
    if (data?.width !== 16) {
        sendError(socket, 'Only 16-bit audio supported');
        return;
    }
}
function sendTranscript(socket) {
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
function sendError(socket, message) {
    const error = {
        type: 'error',
        data: {
            code: 'audio-error',
            message,
        }
    };
    socket.write(JSON.stringify(error) + '\n');
}
//# sourceMappingURL=wyoming.js.map