/**
 * Home Assistant Bridge
 * WebSocket client for Home Assistant API integration
 */
import { EventEmitter } from 'events';
import { HAServiceCallRequest, HAEntity } from './types';
import { SecurityController } from './security';
interface HABridgeConfig {
    url: string;
    token: string;
    securityController?: SecurityController;
}
export declare class HABridge extends EventEmitter {
    private ws?;
    private config;
    private messageId;
    private pendingRequests;
    private reconnecting;
    private connected;
    constructor(config: HABridgeConfig);
    connect(): Promise<void>;
    private handleMessage;
    private authenticate;
    private handleResponse;
    private handleEvent;
    callService(serviceCall: HAServiceCallRequest, options?: {
        timeout?: number;
    }): Promise<any>;
    getState(entityId: string): Promise<HAEntity>;
    getStates(): Promise<HAEntity[]>;
    subscribeEvents(eventType?: string): Promise<number>;
    unsubscribeEvents(subscriptionId: number): Promise<void>;
    private sendRequest;
    private send;
    disconnect(): void;
    isConnected(): boolean;
    isReconnecting(): boolean;
}
export {};
//# sourceMappingURL=ha-bridge.d.ts.map