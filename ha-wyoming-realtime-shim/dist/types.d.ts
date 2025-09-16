/**
 * Type Definitions
 * Core data models and interfaces for the voice service
 */
export type SessionMode = 'ptt' | 'vad';
export type SessionStatus = 'active' | 'paused' | 'ended' | 'error';
export interface VoiceSession {
    sessionId: string;
    mode: SessionMode;
    status: SessionStatus;
    startTime: Date;
    lastActivity: Date;
    audioFormat: AudioFormat;
    openaiSessionId?: string;
    wyomingClientId?: string;
    endTime?: Date;
    errorMessage?: string;
}
export interface AudioFormat {
    sampleRate: number;
    bitDepth: number;
    channels: number;
    encoding: string;
}
export interface ServiceCall {
    callId: string;
    sessionId: string;
    domain: string;
    service: string;
    entityId?: string;
    serviceData?: Record<string, unknown>;
    result: ServiceCallResult;
    timestamp: Date;
    responseTime: number;
    errorMessage?: string;
    confirmed: boolean;
}
export type ServiceCallResult = 'pending' | 'success' | 'failed' | 'unauthorized';
export interface HAEntity {
    entity_id: string;
    state: string;
    attributes: Record<string, unknown>;
    last_changed: string;
    last_updated: string;
    context?: HAContext;
}
export interface HAContext {
    id: string;
    parent_id?: string;
    user_id?: string;
}
export interface HAServiceCallRequest {
    domain: string;
    service: string;
    entity_id?: string | string[];
    data?: Record<string, unknown>;
    target?: {
        entity_id?: string | string[];
        device_id?: string | string[];
        area_id?: string | string[];
    };
}
export interface HAEvent {
    event_type: string;
    data: Record<string, unknown>;
    origin: 'LOCAL' | 'REMOTE';
    time_fired: string;
    context: HAContext;
}
export type DeviceType = 'input' | 'output';
export interface AudioDevice {
    deviceId: string;
    name: string;
    type: DeviceType;
    isDefault: boolean;
    isAvailable: boolean;
    capabilities: AudioCapabilities;
    lastSeen: Date;
}
export interface AudioCapabilities {
    supportedSampleRates: number[];
    supportedBitDepths: number[];
    supportedChannels: number[];
    maxLatency: number;
    bufferSize: number;
}
export interface AudioStreamConfig {
    deviceId?: string;
    sampleRate: number;
    bitDepth: number;
    channels: number;
    latency?: 'low' | 'normal' | 'high';
    bufferSize?: number;
}
export type RemoteEventType = 'short_press' | 'long_press' | 'long_release';
export type RemoteAction = 'start_ptt' | 'stop_ptt' | 'toggle_vad';
export interface RemoteEvent {
    eventId: string;
    deviceId: string;
    buttonId: number;
    eventType: RemoteEventType;
    timestamp: Date;
    mappedAction: RemoteAction;
    processed: boolean;
}
export interface RealtimeEvent {
    type: string;
    event_id?: string;
    [key: string]: unknown;
}
export interface SessionUpdateEvent extends RealtimeEvent {
    type: 'session.update';
    session: SessionConfig;
}
export interface AudioAppendEvent extends RealtimeEvent {
    type: 'input_audio_buffer.append';
    audio: string;
}
export interface FunctionCallEvent extends RealtimeEvent {
    type: 'response.function_call_arguments.done';
    response_id: string;
    item_id: string;
    output_index: number;
    call_id: string;
    name: string;
    arguments: string;
}
export interface AudioDeltaEvent extends RealtimeEvent {
    type: 'response.audio.delta';
    response_id: string;
    item_id: string;
    output_index: number;
    content_index: number;
    delta: string;
}
export interface SessionConfig {
    model: string;
    modalities: ('text' | 'audio')[];
    instructions: string;
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    input_audio_format: 'pcm16';
    output_audio_format: 'pcm16';
    input_audio_transcription?: {
        model: 'whisper-1';
    };
    turn_detection: {
        type: 'server_vad' | 'none';
        threshold: number;
        prefix_padding_ms: number;
        silence_duration_ms: number;
    };
    tools: Tool[];
    tool_choice: 'auto' | 'none' | 'required';
    temperature: number;
    max_response_output_tokens: number;
}
export interface Tool {
    type: 'function';
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}
export interface WyomingMessage {
    type: string;
    data?: Record<string, unknown>;
}
export interface WyomingInfoMessage extends WyomingMessage {
    type: 'info';
    data: {
        stt: SttInfo[];
    };
}
export interface SttInfo {
    name: string;
    description: string;
    installed: boolean;
    languages: string[];
    version: string;
}
export interface AudioStartMessage extends WyomingMessage {
    type: 'audio-start';
    data: {
        timestamp: number;
        rate: number;
        width: number;
        channels: number;
    };
}
export interface AudioChunkMessage extends WyomingMessage {
    type: 'audio-chunk';
    data: {
        audio: string;
        timestamp: number;
    };
}
export interface TranscriptMessage extends WyomingMessage {
    type: 'transcript';
    data: {
        text: string;
        confidence: number;
        language: string;
    };
}
export interface SecurityValidation {
    allowed: boolean;
    reason?: string;
    requiresConfirmation: boolean;
    confirmationPrompt?: string;
    sanitizedEntityId?: string;
}
export interface SecurityConfig {
    allowedDomains: string[];
    entityWhitelist: string[];
    confirmHighRiskActions: boolean;
}
export interface AuditLogEntry {
    timestamp: Date;
    action: string;
    domain?: string;
    service?: string;
    entity_id?: string;
    allowed: boolean;
    violation_type?: string;
    confirmed?: boolean;
    session_id?: string;
    user_context?: string;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    timestamp: string;
}
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
export interface SessionResponse {
    session_id: string;
    mode: SessionMode;
    status: SessionStatus;
    timestamp: string;
    audio_device?: string;
}
export interface VadResponse {
    vad_enabled: boolean;
    timestamp: string;
    session_id?: string;
}
export interface StatusResponse {
    service_status: 'running' | 'starting' | 'error';
    timestamp: string;
    current_session?: SessionResponse;
    vad_enabled: boolean;
    audio_devices: AudioDevice[];
    openai_connection: 'connected' | 'disconnected' | 'connecting';
    ha_connection: 'connected' | 'disconnected' | 'connecting';
}
export interface HealthResponse {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    checks: {
        audio_devices: boolean;
        openai_api: boolean;
        home_assistant: boolean;
        memory_usage: number;
    };
}
export interface LogContext {
    session_id?: string;
    call_id?: string;
    correlation_id?: string;
    user_id?: string;
    domain?: string;
    service?: string;
    entity_id?: string;
    latency_ms?: number;
    [key: string]: unknown;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface Configuration {
    openaiApiKey: string;
    realtimeApiUrl: string;
    model: string;
    haUrl: string;
    haToken: string;
    allowedDomains: string[];
    entityWhitelist: string[];
    confirmHighRiskActions: boolean;
    audioFormat: string;
    enableTtsMirror: boolean;
    ttsService: string;
    ttsMediaPlayer: string;
    httpPort: number;
    vadEnabledDefault: boolean;
    sessionSilenceTimeoutMs: number;
    sessionMaxDurationMs: number;
}
export interface EventMap {
    'session_started': VoiceSession;
    'session_ended': VoiceSession;
    'session_error': {
        session: VoiceSession;
        error: Error;
    };
    'audio_input': {
        session_id: string;
        audio: Buffer;
    };
    'audio_output': {
        session_id: string;
        audio: Buffer;
    };
    'audio_device_changed': AudioDevice;
    'openai_connected': void;
    'openai_disconnected': {
        reason: string;
    };
    'function_call': {
        call_id: string;
        name: string;
        arguments: Record<string, unknown>;
    };
    'ha_connected': void;
    'ha_disconnected': {
        reason: string;
    };
    'service_call_completed': ServiceCall;
    'security_violation': {
        violation: string;
        details: Record<string, unknown>;
    };
    'confirmation_required': {
        prompt: string;
        call_id: string;
    };
    'remote_button_press': RemoteEvent;
    'ptt_started': {
        session_id: string;
    };
    'ptt_stopped': {
        session_id: string;
    };
    'vad_toggled': {
        enabled: boolean;
    };
}
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];
export type Timestamp = string;
export type UUID = string;
export type Base64Audio = string;
//# sourceMappingURL=types.d.ts.map