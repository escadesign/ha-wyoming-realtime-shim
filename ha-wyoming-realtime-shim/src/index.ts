/**
 * Main Application Entry Point
 * Orchestrates all services and manages application lifecycle
 */

import * as http from 'http';
import * as net from 'net';
import { configManager, Configuration } from './config';
import { logger, setCorrelationId } from './logging';
import { createWyomingServer } from './wyoming';
import { OpenAIRealtimeClient } from './realtime';
import { HABridge } from './ha-bridge';
import { AudioDeviceManager } from './audio';
import { SecurityController } from './security';
import { createControlAPI } from './control-api';
import { VoiceResponseGenerator } from './prompt';

interface ApplicationConfig {
  port?: number;
  wyomingPort?: number;
  openaiApiKey?: string;
  haToken?: string;
  haUrl?: string;
}

export class VoiceServiceApplication {
  private config: Configuration;
  private wyomingServer: net.Server;
  private httpServer: http.Server;
  private openaiClient: OpenAIRealtimeClient;
  private haBridge: HABridge;
  private audioManager: AudioDeviceManager;
  private securityController: SecurityController;
  private voiceResponseGenerator: VoiceResponseGenerator;
  private isRunning = false;

  constructor(config: Configuration) {
    this.config = config;
    this.securityController = new SecurityController({
      allowedDomains: config.allowedDomains,
      entityWhitelist: config.entityWhitelist,
      confirmHighRiskActions: config.confirmHighRiskActions,
    });

    this.voiceResponseGenerator = new VoiceResponseGenerator(config);
    this.audioManager = new AudioDeviceManager();
    
    // Initialize OpenAI client
    this.openaiClient = new OpenAIRealtimeClient({
      apiKey: config.openaiApiKey,
      model: config.model,
      voice: 'alloy',
    });

    // Initialize HA bridge
    this.haBridge = new HABridge({
      url: config.haUrl,
      token: config.haToken,
      securityController: this.securityController,
    });

    // Initialize servers
    this.wyomingServer = createWyomingServer();
    const controlAPI = createControlAPI();
    this.httpServer = http.createServer(controlAPI);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // OpenAI event handlers
    this.openaiClient.on('function_call', async (functionCall) => {
      await this.handleFunctionCall(functionCall);
    });

    this.openaiClient.on('audio_output', (audioData) => {
      // Stream audio to output device
      logger.debug('Received audio output from OpenAI', {
        audio_length: audioData.audio.length,
      });
    });

    this.openaiClient.on('error', (error) => {
      logger.error('OpenAI client error', { error: error.message });
    });

    // HA bridge event handlers
    this.haBridge.on('connected', () => {
      logger.info('Home Assistant connected');
    });

    this.haBridge.on('disconnected', (reason) => {
      logger.warn('Home Assistant disconnected', reason);
    });

    this.haBridge.on('hue_event', (event) => {
      this.handleHueRemoteEvent(event);
    });

    // Audio device event handlers
    this.audioManager.on('device_connected', (device) => {
      logger.info('Audio device connected', { device: device.name });
    });

    this.audioManager.on('device_disconnected', (device) => {
      logger.warn('Audio device disconnected', { device: device.name });
    });

    // Process cleanup
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  private async handleFunctionCall(functionCall: any): Promise<void> {
    const { call_id, name, arguments: args } = functionCall;
    
    logger.info('Handling function call', {
      call_id,
      function: name,
      arguments: args,
    });

    try {
      let result: any;

      switch (name) {
        case 'call_service':
          result = await this.haBridge.callService(args);
          const successResponse = this.voiceResponseGenerator.generateSuccessResponse(
            args.domain,
            args.service,
            args.entity_id
          );
          logger.info('Service call completed', { call_id, result, response: successResponse });
          break;

        case 'get_state':
          result = await this.haBridge.getState(args.entity_id);
          // const stateResponse = this.voiceResponseGenerator.generateStateResponse(result);
          logger.info('State query completed', { call_id, entity_id: args.entity_id, state: result.state });
          break;

        default:
          throw new Error(`Unknown function: ${name}`);
      }

      // Send successful result back to OpenAI
      await this.openaiClient.sendFunctionResult(call_id, {
        success: true,
        result,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Function call failed', {
        call_id,
        function: name,
        error: errorMessage,
      });

      const errorResponse = this.voiceResponseGenerator.generateErrorResponse(
        errorMessage,
        args?.domain,
        args?.entity_id
      );

      // Send error result back to OpenAI
      await this.openaiClient.sendFunctionResult(call_id, {
        success: false,
        error: errorMessage,
        user_message: errorResponse,
      });
    }
  }

  private handleHueRemoteEvent(event: any): void {
    const { type, subtype } = event;

    logger.info('Hue remote event received', { type, subtype });

    // Button 2: PTT control
    if (subtype === 2) {
      if (type === 'long_press') {
        // Start PTT session
        logger.info('Starting PTT session via Hue remote');
        // This would trigger the control API
      } else if (type === 'long_release') {
        // Stop PTT session
        logger.info('Stopping PTT session via Hue remote');
        // This would trigger the control API
      }
    }

    // Button 3: VAD toggle
    if (subtype === 3 && type === 'short_press') {
      logger.info('Toggling VAD via Hue remote');
      // This would trigger the control API
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Application is already running');
    }

    logger.info('Starting HA Wyoming Realtime Shim application');

    try {
      // Start Wyoming server
      await new Promise<void>((resolve, reject) => {
        this.wyomingServer.listen(10600, '0.0.0.0', (err?: Error) => {
          if (err) reject(err);
          else {
            logger.info('Wyoming server listening on port 10600');
            resolve();
          }
        });
      });

      // Start HTTP server
      await new Promise<void>((resolve, reject) => {
        this.httpServer.listen(this.config.httpPort, '127.0.0.1', (err?: Error) => {
          if (err) reject(err);
          else {
            logger.info('HTTP control API listening', { port: this.config.httpPort });
            resolve();
          }
        });
      });

      // Connect to OpenAI
      await this.openaiClient.connect();
      logger.info('OpenAI Realtime client connected');

      // Connect to Home Assistant
      await this.haBridge.connect();
      logger.info('Home Assistant bridge connected');

      this.isRunning = true;
      logger.info('Application started successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to start application', { error: errorMessage });
      await this.shutdown();
      throw error;
    }
  }

  async stop(): Promise<void> {
    await this.shutdown();
  }

  private async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Shutting down application');
    this.isRunning = false;

    try {
      // Close servers
      await Promise.all([
        new Promise<void>((resolve) => {
          this.wyomingServer.close(() => resolve());
        }),
        new Promise<void>((resolve) => {
          this.httpServer.close(() => resolve());
        }),
      ]);

      // Disconnect clients
      this.openaiClient.disconnect();
      this.haBridge.disconnect();
      this.audioManager.cleanup();

      logger.info('Application shutdown complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error during shutdown', { error: errorMessage });
    }
  }

  get express() {
    // For testing access to HTTP server
    return this.httpServer;
  }
}

/**
 * Start application with configuration
 */
export async function startApplication(customConfig?: ApplicationConfig): Promise<VoiceServiceApplication> {
  // Set correlation ID for startup process
  setCorrelationId('startup');

  try {
    // Load configuration
    let config: Configuration;
    
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
    } else {
      config = await configManager.loadConfiguration();
    }

    // Create and start application
    const app = new VoiceServiceApplication(config);
    await app.start();

    return app;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to start application', { error: errorMessage });
    process.exit(1);
  }
}

// Start application if this file is run directly
if (require.main === module) {
  startApplication().catch((error) => {
    logger.error('Application startup failed', { error: error.message });
    process.exit(1);
  });
}

export default startApplication;
