/**
 * Home Assistant Bridge
 * WebSocket client for Home Assistant API integration
 */

import { EventEmitter } from 'events';
import WS from 'ws';
import { logger } from './logging';
import { HAServiceCallRequest, HAEntity } from './types';
import { SecurityController } from './security';

interface HABridgeConfig {
  url: string;
  token: string;
  securityController?: SecurityController;
}

export class HABridge extends EventEmitter {
  private ws?: WS;
  private config: HABridgeConfig;
  private messageId = 1;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private reconnecting = false;
  private connected = false;

  constructor(config: HABridgeConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WS(this.config.url);

      this.ws.on('open', () => {
        logger.info('HA WebSocket connected');
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.emit('message_error', { message: errorMessage });
        }
      });

      this.ws.on('error', (error) => {
        logger.error('HA WebSocket error', { error: error.message });
        this.emit('connection_error', error);
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        this.connected = false;
        this.emit('disconnected', { code, reason: reason.toString() });
      });

      // Set up auth flow
      this.once('auth_required', () => {
        this.authenticate();
      });

      this.once('auth_ok', () => {
        this.connected = true;
        this.emit('connected');
        resolve();
      });

      this.once('auth_invalid', (message) => {
        this.emit('auth_error', message);
        reject(new Error(`Authentication failed: ${message}`));
      });
    });
  }

  private handleMessage(message: any): void {
    if (message.type === 'auth_required') {
      this.emit('auth_required');
    } else if (message.type === 'auth_ok') {
      this.emit('auth_ok');
    } else if (message.type === 'auth_invalid') {
      this.emit('auth_invalid', message.message);
    } else if (message.type === 'result' && message.id) {
      this.handleResponse(message);
    } else if (message.type === 'event') {
      this.handleEvent(message.event);
    }
  }

  private authenticate(): void {
    this.send({
      type: 'auth',
      access_token: this.config.token,
    });
  }

  private handleResponse(message: any): void {
    const pending = this.pendingRequests.get(message.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id);

      if (message.success) {
        pending.resolve(message.result);
      } else {
        pending.reject(new Error(message.error?.message || 'Unknown error'));
      }
    }
  }

  private handleEvent(event: any): void {
    if (event.event_type === 'state_changed') {
      this.emit('state_changed', event.data);
    } else if (event.event_type === 'hue_event') {
      this.emit('hue_event', event.data);
    }
  }

  async callService(serviceCall: HAServiceCallRequest, options: { timeout?: number } = {}): Promise<any> {
    // Security validation
    if (this.config.securityController) {
      const validation = await this.config.securityController.validateServiceCall(serviceCall);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }
    }

    const id = this.messageId++;
    const message = {
      id,
      type: 'call_service',
      domain: serviceCall.domain,
      service: serviceCall.service,
      ...(serviceCall.entity_id && {
        target: { entity_id: serviceCall.entity_id }
      }),
      ...(serviceCall.data && { service_data: serviceCall.data }),
    };

    return this.sendRequest(message, options.timeout);
  }

  async getState(entityId: string): Promise<HAEntity> {
    const states = await this.getStates();
    const entity = states.find((s: HAEntity) => s.entity_id === entityId);
    if (!entity) {
      throw new Error('Entity not found');
    }
    return entity;
  }

  async getStates(): Promise<HAEntity[]> {
    const id = this.messageId++;
    const message = {
      id,
      type: 'get_states',
    };

    return this.sendRequest(message);
  }

  async subscribeEvents(eventType?: string): Promise<number> {
    const id = this.messageId++;
    const message = {
      id,
      type: 'subscribe_events',
      ...(eventType && { event_type: eventType }),
    };

    await this.sendRequest(message);
    return id;
  }

  async unsubscribeEvents(subscriptionId: number): Promise<void> {
    const id = this.messageId++;
    const message = {
      id,
      type: 'unsubscribe_events',
      subscription: subscriptionId,
    };

    await this.sendRequest(message);
  }

  private sendRequest(message: any, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error('Request timeout'));
      }, timeout);

      this.pendingRequests.set(message.id, { resolve, reject, timeout: timeoutHandle });
      this.send(message);
    });
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WS.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    this.connected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = undefined as any;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  isReconnecting(): boolean {
    return this.reconnecting;
  }
}
