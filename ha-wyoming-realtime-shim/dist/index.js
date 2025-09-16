"use strict";
/**
 * Main Application Entry Point
 * Orchestrates all services and manages application lifecycle
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
exports.VoiceServiceApplication = void 0;
exports.startApplication = startApplication;
const http = __importStar(require("http"));
const config_1 = require("./config");
const logging_1 = require("./logging");
const wyoming_1 = require("./wyoming");
const realtime_1 = require("./realtime");
const ha_bridge_1 = require("./ha-bridge");
const audio_1 = require("./audio");
const security_1 = require("./security");
const control_api_1 = require("./control-api");
const prompt_1 = require("./prompt");
class VoiceServiceApplication {
    constructor(config) {
        this.isRunning = false;
        this.config = config;
        this.securityController = new security_1.SecurityController({
            allowedDomains: config.allowedDomains,
            entityWhitelist: config.entityWhitelist,
            confirmHighRiskActions: config.confirmHighRiskActions,
        });
        this.voiceResponseGenerator = new prompt_1.VoiceResponseGenerator(config);
        this.audioManager = new audio_1.AudioDeviceManager();
        // Initialize OpenAI client
        this.openaiClient = new realtime_1.OpenAIRealtimeClient({
            apiKey: config.openaiApiKey,
            model: config.model,
            voice: 'alloy',
        });
        // Initialize HA bridge
        this.haBridge = new ha_bridge_1.HABridge({
            url: config.haUrl,
            token: config.haToken,
            securityController: this.securityController,
        });
        // Initialize servers
        this.wyomingServer = (0, wyoming_1.createWyomingServer)();
        const controlAPI = (0, control_api_1.createControlAPI)();
        this.httpServer = http.createServer(controlAPI);
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        // OpenAI event handlers
        this.openaiClient.on('function_call', async (functionCall) => {
            await this.handleFunctionCall(functionCall);
        });
        this.openaiClient.on('audio_output', (audioData) => {
            // Stream audio to output device
            logging_1.logger.debug('Received audio output from OpenAI', {
                audio_length: audioData.audio.length,
            });
        });
        this.openaiClient.on('error', (error) => {
            logging_1.logger.error('OpenAI client error', { error: error.message });
        });
        // HA bridge event handlers
        this.haBridge.on('connected', () => {
            logging_1.logger.info('Home Assistant connected');
        });
        this.haBridge.on('disconnected', (reason) => {
            logging_1.logger.warn('Home Assistant disconnected', reason);
        });
        this.haBridge.on('hue_event', (event) => {
            this.handleHueRemoteEvent(event);
        });
        // Audio device event handlers
        this.audioManager.on('device_connected', (device) => {
            logging_1.logger.info('Audio device connected', { device: device.name });
        });
        this.audioManager.on('device_disconnected', (device) => {
            logging_1.logger.warn('Audio device disconnected', { device: device.name });
        });
        // Process cleanup
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
    }
    async handleFunctionCall(functionCall) {
        const { call_id, name, arguments: args } = functionCall;
        logging_1.logger.info('Handling function call', {
            call_id,
            function: name,
            arguments: args,
        });
        try {
            let result;
            switch (name) {
                case 'call_service':
                    result = await this.haBridge.callService(args);
                    const successResponse = this.voiceResponseGenerator.generateSuccessResponse(args.domain, args.service, args.entity_id);
                    logging_1.logger.info('Service call completed', { call_id, result, response: successResponse });
                    break;
                case 'get_state':
                    result = await this.haBridge.getState(args.entity_id);
                    // const stateResponse = this.voiceResponseGenerator.generateStateResponse(result);
                    logging_1.logger.info('State query completed', { call_id, entity_id: args.entity_id, state: result.state });
                    break;
                default:
                    throw new Error(`Unknown function: ${name}`);
            }
            // Send successful result back to OpenAI
            await this.openaiClient.sendFunctionResult(call_id, {
                success: true,
                result,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logging_1.logger.error('Function call failed', {
                call_id,
                function: name,
                error: errorMessage,
            });
            const errorResponse = this.voiceResponseGenerator.generateErrorResponse(errorMessage, args?.domain, args?.entity_id);
            // Send error result back to OpenAI
            await this.openaiClient.sendFunctionResult(call_id, {
                success: false,
                error: errorMessage,
                user_message: errorResponse,
            });
        }
    }
    handleHueRemoteEvent(event) {
        const { type, subtype } = event;
        logging_1.logger.info('Hue remote event received', { type, subtype });
        // Button 2: PTT control
        if (subtype === 2) {
            if (type === 'long_press') {
                // Start PTT session
                logging_1.logger.info('Starting PTT session via Hue remote');
                // This would trigger the control API
            }
            else if (type === 'long_release') {
                // Stop PTT session
                logging_1.logger.info('Stopping PTT session via Hue remote');
                // This would trigger the control API
            }
        }
        // Button 3: VAD toggle
        if (subtype === 3 && type === 'short_press') {
            logging_1.logger.info('Toggling VAD via Hue remote');
            // This would trigger the control API
        }
    }
    async start() {
        if (this.isRunning) {
            throw new Error('Application is already running');
        }
        logging_1.logger.info('Starting HA Wyoming Realtime Shim application');
        try {
            // Start Wyoming server
            await new Promise((resolve, reject) => {
                this.wyomingServer.listen(10600, '0.0.0.0', (err) => {
                    if (err)
                        reject(err);
                    else {
                        logging_1.logger.info('Wyoming server listening on port 10600');
                        resolve();
                    }
                });
            });
            // Start HTTP server
            await new Promise((resolve, reject) => {
                this.httpServer.listen(this.config.httpPort, '127.0.0.1', (err) => {
                    if (err)
                        reject(err);
                    else {
                        logging_1.logger.info('HTTP control API listening', { port: this.config.httpPort });
                        resolve();
                    }
                });
            });
            // Connect to OpenAI
            await this.openaiClient.connect();
            logging_1.logger.info('OpenAI Realtime client connected');
            // Connect to Home Assistant
            await this.haBridge.connect();
            logging_1.logger.info('Home Assistant bridge connected');
            this.isRunning = true;
            logging_1.logger.info('Application started successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logging_1.logger.error('Failed to start application', { error: errorMessage });
            await this.shutdown();
            throw error;
        }
    }
    async stop() {
        await this.shutdown();
    }
    async shutdown() {
        if (!this.isRunning) {
            return;
        }
        logging_1.logger.info('Shutting down application');
        this.isRunning = false;
        try {
            // Close servers
            await Promise.all([
                new Promise((resolve) => {
                    this.wyomingServer.close(() => resolve());
                }),
                new Promise((resolve) => {
                    this.httpServer.close(() => resolve());
                }),
            ]);
            // Disconnect clients
            this.openaiClient.disconnect();
            this.haBridge.disconnect();
            this.audioManager.cleanup();
            logging_1.logger.info('Application shutdown complete');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logging_1.logger.error('Error during shutdown', { error: errorMessage });
        }
    }
    get express() {
        // For testing access to HTTP server
        return this.httpServer;
    }
}
exports.VoiceServiceApplication = VoiceServiceApplication;
/**
 * Start application with configuration
 */
async function startApplication(customConfig) {
    // Set correlation ID for startup process
    (0, logging_1.setCorrelationId)('startup');
    try {
        // Load configuration
        let config;
        if (customConfig) {
            // Use provided config for testing
            config = {
                openaiApiKey: customConfig.openaiApiKey || 'sk-test-key',
                realtimeApiUrl: 'wss://api.openai.com/v1/realtime',
                model: 'gpt-realtime',
                haUrl: customConfig.haUrl || 'ws://localhost:8123/api/websocket',
                haToken: customConfig.haToken || 'test-token',
                allowedDomains: ['light', 'switch', 'climate'],
                entityWhitelist: [],
                confirmHighRiskActions: true,
                audioFormat: 'pcm16',
                enableTtsMirror: false,
                ttsService: 'tts.piper',
                ttsMediaPlayer: '',
                httpPort: customConfig.port || 5000,
                vadEnabledDefault: false,
                sessionSilenceTimeoutMs: 30000,
                sessionMaxDurationMs: 300000,
            };
        }
        else {
            config = await config_1.configManager.loadConfiguration();
        }
        // Create and start application
        const app = new VoiceServiceApplication(config);
        await app.start();
        return app;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logging_1.logger.error('Failed to start application', { error: errorMessage });
        process.exit(1);
    }
}
// Start application if this file is run directly
if (require.main === module) {
    startApplication().catch((error) => {
        logging_1.logger.error('Application startup failed', { error: error.message });
        process.exit(1);
    });
}
exports.default = startApplication;
//# sourceMappingURL=index.js.map