/**
 * Logging Infrastructure
 * Structured JSON logging with correlation IDs and context
 */
import { LogLevel, LogContext } from './types';
/**
 * Get or generate correlation ID for current context
 */
export declare function getCorrelationId(): string;
/**
 * Set correlation ID for current context
 */
export declare function setCorrelationId(id: string): void;
/**
 * Clear correlation ID
 */
export declare function clearCorrelationId(): void;
/**
 * Run function with specific correlation ID
 */
export declare function withCorrelationId<T>(id: string, fn: () => T): T;
/**
 * Enhanced logger with context support
 */
declare class ContextualLogger {
    private winston;
    constructor();
    private formatMessage;
    /**
     * Remove sensitive information from log context
     */
    private sanitizeContext;
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
    /**
     * Log with custom level
     */
    log(level: LogLevel, message: string, context?: LogContext): void;
    /**
     * Create child logger with default context
     */
    child(defaultContext: LogContext): ChildLogger;
    /**
     * Log performance metrics
     */
    performance(operation: string, durationMs: number, context?: LogContext): void;
    /**
     * Log security events
     */
    security(event: string, context?: LogContext): void;
    /**
     * Log audit events
     */
    audit(action: string, context?: LogContext): void;
    /**
     * Get current log level
     */
    getLevel(): string;
    /**
     * Set log level
     */
    setLevel(level: LogLevel): void;
}
/**
 * Child logger with inherited context
 */
declare class ChildLogger {
    private parent;
    private defaultContext;
    constructor(parent: ContextualLogger, defaultContext: LogContext);
    private mergeContext;
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
    performance(operation: string, durationMs: number, context?: LogContext): void;
    security(event: string, context?: LogContext): void;
    audit(action: string, context?: LogContext): void;
}
/**
 * Performance measurement utility
 */
export declare class PerformanceTimer {
    private startTime;
    private operation;
    private context;
    constructor(operation: string, context?: LogContext);
    /**
     * End timing and log performance
     */
    end(additionalContext?: LogContext): number;
    /**
     * Get current duration without ending
     */
    getDuration(): number;
}
/**
 * Performance measurement decorator
 */
export declare function measurePerformance(operation: string, context?: LogContext): (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => void;
/**
 * Session-aware logging utility
 */
export declare function createSessionLogger(sessionId: string): ChildLogger;
/**
 * Service call logging utility
 */
export declare function createServiceCallLogger(callId: string, sessionId?: string): ChildLogger;
/**
 * Request logging utility
 */
export declare function createRequestLogger(requestId: string): ChildLogger;
export declare const logger: ContextualLogger;
export default logger;
//# sourceMappingURL=logging.d.ts.map