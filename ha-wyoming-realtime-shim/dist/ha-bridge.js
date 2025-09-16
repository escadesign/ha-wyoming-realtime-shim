"use strict";
/**
 * Home Assistant Bridge
 * WebSocket client for Home Assistant API integration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HABridge = void 0;
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const logging_1 = require("./logging");
class HABridge extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.messageId = 1;
        this.pendingRequests = new Map();
        this.reconnecting = false;
        this.connected = false;
        this.config = config;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new ws_1.default(this.config.url);
            this.ws.on('open', () => {
                logging_1.logger.info('HA WebSocket connected');
            });
            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.emit('message_error', { message: errorMessage });
                }
            });
            this.ws.on('error', (error) => {
                logging_1.logger.error('HA WebSocket error', { error: error.message });
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
    handleMessage(message) {
        if (message.type === 'auth_required') {
            this.emit('auth_required');
        }
        else if (message.type === 'auth_ok') {
            this.emit('auth_ok');
        }
        else if (message.type === 'auth_invalid') {
            this.emit('auth_invalid', message.message);
        }
        else if (message.type === 'result' && message.id) {
            this.handleResponse(message);
        }
        else if (message.type === 'event') {
            this.handleEvent(message.event);
        }
    }
    authenticate() {
        this.send({
            type: 'auth',
            access_token: this.config.token,
        });
    }
    handleResponse(message) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(message.id);
            if (message.success) {
                pending.resolve(message.result);
            }
            else {
                pending.reject(new Error(message.error?.message || 'Unknown error'));
            }
        }
    }
    handleEvent(event) {
        if (event.event_type === 'state_changed') {
            this.emit('state_changed', event.data);
        }
        else if (event.event_type === 'hue_event') {
            this.emit('hue_event', event.data);
        }
    }
    async callService(serviceCall, options = {}) {
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
    async getState(entityId) {
        const states = await this.getStates();
        const entity = states.find((s) => s.entity_id === entityId);
        if (!entity) {
            throw new Error('Entity not found');
        }
        return entity;
    }
    async getStates() {
        const id = this.messageId++;
        const message = {
            id,
            type: 'get_states',
        };
        return this.sendRequest(message);
    }
    async subscribeEvents(eventType) {
        const id = this.messageId++;
        const message = {
            id,
            type: 'subscribe_events',
            ...(eventType && { event_type: eventType }),
        };
        await this.sendRequest(message);
        return id;
    }
    async unsubscribeEvents(subscriptionId) {
        const id = this.messageId++;
        const message = {
            id,
            type: 'unsubscribe_events',
            subscription: subscriptionId,
        };
        await this.sendRequest(message);
    }
    sendRequest(message, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                this.pendingRequests.delete(message.id);
                reject(new Error('Request timeout'));
            }, timeout);
            this.pendingRequests.set(message.id, { resolve, reject, timeout: timeoutHandle });
            this.send(message);
        });
    }
    send(message) {
        if (this.ws && this.ws.readyState === ws_1.default.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
    disconnect() {
        this.connected = false;
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
    }
    isConnected() {
        return this.connected;
    }
    isReconnecting() {
        return this.reconnecting;
    }
}
exports.HABridge = HABridge;
//# sourceMappingURL=ha-bridge.js.map