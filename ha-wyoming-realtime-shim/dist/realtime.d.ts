/**
 * OpenAI Realtime Client
 * WebSocket client for OpenAI gpt-realtime model
 */
import { EventEmitter } from 'events';
interface ClientConfig {
    apiKey: string;
    model: string;
    voice: string;
}
export declare class OpenAIRealtimeClient extends EventEmitter {
    private ws?;
    private config;
    private reconnecting;
    constructor(config: ClientConfig);
    connect(): Promise<void>;
    private sendSessionUpdate;
    private handleEvent;
    sendAudio(audio: Buffer): Promise<void>;
    commitAudio(): Promise<void>;
    clearAudio(): Promise<void>;
    createResponse(config?: any): Promise<void>;
    cancelResponse(): Promise<void>;
    sendFunctionResult(callId: string, result: any): Promise<void>;
    private send;
    disconnect(): void;
    isReconnecting(): boolean;
    reconnect(): Promise<void>;
}
export {};
//# sourceMappingURL=realtime.d.ts.map