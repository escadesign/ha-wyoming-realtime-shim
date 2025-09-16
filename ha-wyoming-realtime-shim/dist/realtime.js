"use strict";
/**
 * OpenAI Realtime Client
 * WebSocket client for OpenAI gpt-realtime model
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIRealtimeClient = void 0;
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const logging_1 = require("./logging");
class OpenAIRealtimeClient extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.reconnecting = false;
        this.config = config;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new ws_1.default('wss://api.openai.com/v1/realtime', {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'OpenAI-Beta': 'realtime=v1',
                },
            });
            this.ws.on('open', () => {
                logging_1.logger.info('OpenAI Realtime connected');
                this.sendSessionUpdate();
                resolve();
            });
            this.ws.on('message', (data) => {
                try {
                    const event = JSON.parse(data.toString());
                    this.handleEvent(event);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    logging_1.logger.error('Failed to parse OpenAI message', { error: errorMessage });
                }
            });
            this.ws.on('error', (error) => {
                logging_1.logger.error('OpenAI WebSocket error', { error: error.message });
                reject(error);
            });
            this.ws.on('close', (code, reason) => {
                logging_1.logger.info('OpenAI connection closed', { code, reason: reason.toString() });
                this.emit('disconnect', { code, reason: reason.toString() });
            });
        });
    }
    sendSessionUpdate() {
        const tools = [
            {
                type: 'function',
                name: 'call_service',
                description: 'Call a Home Assistant service to control devices',
                parameters: {
                    type: 'object',
                    properties: {
                        domain: { type: 'string' },
                        service: { type: 'string' },
                        entity_id: { type: 'string' },
                        data: { type: 'object' },
                    },
                    required: ['domain', 'service'],
                },
            },
            {
                type: 'function',
                name: 'get_state',
                description: 'Get the current state of a Home Assistant entity',
                parameters: {
                    type: 'object',
                    properties: {
                        entity_id: { type: 'string' },
                    },
                    required: ['entity_id'],
                },
            },
        ];
        const sessionConfig = {
            model: this.config.model,
            modalities: ['text', 'audio'],
            instructions: 'You are a helpful assistant for controlling a smart home through Home Assistant.',
            voice: this.config.voice,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 800,
            },
            tools,
            tool_choice: 'auto',
            temperature: 0.8,
            max_response_output_tokens: 4096,
        };
        this.send({
            type: 'session.update',
            session: sessionConfig,
        });
    }
    handleEvent(event) {
        switch (event.type) {
            case 'response.audio.delta':
                this.emit('audio_output', {
                    audio: Buffer.from(event.delta, 'base64'),
                    response_id: event.response_id,
                });
                break;
            case 'response.audio.done':
                this.emit('audio_complete', {
                    response_id: event.response_id,
                    item_id: event.item_id,
                });
                break;
            case 'response.function_call_arguments.done':
                this.emit('function_call', {
                    call_id: event.call_id,
                    name: event.name,
                    arguments: JSON.parse(event.arguments),
                    response_id: event.response_id,
                });
                break;
            case 'input_audio_buffer.speech_started':
                this.emit('speech_started');
                break;
            case 'input_audio_buffer.speech_stopped':
                this.emit('speech_stopped');
                break;
            case 'rate_limits.updated':
                this.emit('rate_limit', event.rate_limits);
                break;
            case 'error':
                this.emit('error', event.error);
                break;
        }
    }
    async sendAudio(audio) {
        this.send({
            type: 'input_audio_buffer.append',
            audio: audio.toString('base64'),
        });
    }
    async commitAudio() {
        this.send({ type: 'input_audio_buffer.commit' });
    }
    async clearAudio() {
        this.send({ type: 'input_audio_buffer.clear' });
    }
    async createResponse(config) {
        this.send({
            type: 'response.create',
            response: config,
        });
    }
    async cancelResponse() {
        this.send({ type: 'response.cancel' });
    }
    async sendFunctionResult(callId, result) {
        this.send({
            type: 'conversation.item.create',
            item: {
                type: 'function_call_output',
                call_id: callId,
                output: JSON.stringify(result),
            },
        });
    }
    send(event) {
        if (this.ws && this.ws.readyState === ws_1.default.OPEN) {
            this.ws.send(JSON.stringify(event));
        }
    }
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
    }
    isReconnecting() {
        return this.reconnecting;
    }
    async reconnect() {
        this.reconnecting = true;
        try {
            await this.connect();
        }
        finally {
            this.reconnecting = false;
        }
    }
}
exports.OpenAIRealtimeClient = OpenAIRealtimeClient;
//# sourceMappingURL=realtime.js.map