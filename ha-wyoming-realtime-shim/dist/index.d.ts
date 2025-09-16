/**
 * Main Application Entry Point
 * Orchestrates all services and manages application lifecycle
 */
import * as http from 'http';
import { Configuration } from './config';
interface ApplicationConfig {
    port?: number;
    wyomingPort?: number;
    openaiApiKey?: string;
    haToken?: string;
    haUrl?: string;
}
export declare class VoiceServiceApplication {
    private config;
    private wyomingServer;
    private httpServer;
    private openaiClient;
    private haBridge;
    private audioManager;
    private securityController;
    private voiceResponseGenerator;
    private isRunning;
    constructor(config: Configuration);
    private setupEventHandlers;
    private handleFunctionCall;
    private handleHueRemoteEvent;
    start(): Promise<void>;
    stop(): Promise<void>;
    private shutdown;
    get express(): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
}
/**
 * Start application with configuration
 */
export declare function startApplication(customConfig?: ApplicationConfig): Promise<VoiceServiceApplication>;
export default startApplication;
//# sourceMappingURL=index.d.ts.map