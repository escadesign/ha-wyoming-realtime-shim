/**
 * OpenAI Realtime Client
 * WebSocket client for OpenAI gpt-realtime model
 */

import { EventEmitter } from 'events';
import WS from 'ws';
import { logger } from './logging';
import { RealtimeEvent, SessionConfig, Tool } from './types';

interface ClientConfig {
  apiKey: string;
  model: string;
  voice: string;
}

export class OpenAIRealtimeClient extends EventEmitter {
  private ws?: WS;
  private config: ClientConfig;
  private reconnecting = false;

  constructor(config: ClientConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WS('wss://api.openai.com/v1/realtime', {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      this.ws.on('open', () => {
        logger.info('OpenAI Realtime connected');
        this.sendSessionUpdate();
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString()) as RealtimeEvent;
          this.handleEvent(event);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Failed to parse OpenAI message', { error: errorMessage });
        }
      });

      this.ws.on('error', (error) => {
        logger.error('OpenAI WebSocket error', { error: error.message });
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        logger.info('OpenAI connection closed', { code, reason: reason.toString() });
        this.emit('disconnect', { code, reason: reason.toString() });
      });
    });
  }

  private sendSessionUpdate(): void {
    const tools: Tool[] = [
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

    const sessionConfig: SessionConfig = {
      model: this.config.model,
      modalities: ['text', 'audio'],
      instructions: 'You are a helpful assistant for controlling a smart home through Home Assistant.',
      voice: this.config.voice as any,
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

  private handleEvent(event: RealtimeEvent): void {
    switch (event.type) {
      case 'response.audio.delta':
        this.emit('audio_output', {
          audio: Buffer.from((event as any).delta, 'base64'),
          response_id: (event as any).response_id,
        });
        break;
      case 'response.audio.done':
        this.emit('audio_complete', {
          response_id: (event as any).response_id,
          item_id: (event as any).item_id,
        });
        break;
      case 'response.function_call_arguments.done':
        this.emit('function_call', {
          call_id: (event as any).call_id,
          name: (event as any).name,
          arguments: JSON.parse((event as any).arguments),
          response_id: (event as any).response_id,
        });
        break;
      case 'input_audio_buffer.speech_started':
        this.emit('speech_started');
        break;
      case 'input_audio_buffer.speech_stopped':
        this.emit('speech_stopped');
        break;
      case 'rate_limits.updated':
        this.emit('rate_limit', (event as any).rate_limits);
        break;
      case 'error':
        this.emit('error', (event as any).error);
        break;
    }
  }

  async sendAudio(audio: Buffer): Promise<void> {
    this.send({
      type: 'input_audio_buffer.append',
      audio: audio.toString('base64'),
    });
  }

  async commitAudio(): Promise<void> {
    this.send({ type: 'input_audio_buffer.commit' });
  }

  async clearAudio(): Promise<void> {
    this.send({ type: 'input_audio_buffer.clear' });
  }

  async createResponse(config?: any): Promise<void> {
    this.send({
      type: 'response.create',
      response: config,
    });
  }

  async cancelResponse(): Promise<void> {
    this.send({ type: 'response.cancel' });
  }

  async sendFunctionResult(callId: string, result: any): Promise<void> {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result),
      },
    });
  }

  private send(event: RealtimeEvent): void {
    if (this.ws && this.ws.readyState === WS.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined as any;
    }
  }

  isReconnecting(): boolean {
    return this.reconnecting;
  }

  async reconnect(): Promise<void> {
    this.reconnecting = true;
    try {
      await this.connect();
    } finally {
      this.reconnecting = false;
    }
  }
}
