"use strict";
/**
 * Logging Infrastructure
 * Structured JSON logging with correlation IDs and context
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.PerformanceTimer = void 0;
exports.getCorrelationId = getCorrelationId;
exports.setCorrelationId = setCorrelationId;
exports.clearCorrelationId = clearCorrelationId;
exports.withCorrelationId = withCorrelationId;
exports.measurePerformance = measurePerformance;
exports.createSessionLogger = createSessionLogger;
exports.createServiceCallLogger = createServiceCallLogger;
exports.createRequestLogger = createRequestLogger;
const winston_1 = __importDefault(require("winston"));
const uuid_1 = require("uuid");
// Correlation ID for tracking requests across components
let currentCorrelationId = null;
/**
 * Get or generate correlation ID for current context
 */
function getCorrelationId() {
    if (!currentCorrelationId) {
        currentCorrelationId = (0, uuid_1.v4)();
    }
    return currentCorrelationId;
}
/**
 * Set correlation ID for current context
 */
function setCorrelationId(id) {
    currentCorrelationId = id;
}
/**
 * Clear correlation ID
 */
function clearCorrelationId() {
    currentCorrelationId = null;
}
/**
 * Run function with specific correlation ID
 */
function withCorrelationId(id, fn) {
    const previousId = currentCorrelationId;
    setCorrelationId(id);
    try {
        return fn();
    }
    finally {
        currentCorrelationId = previousId;
    }
}
/**
 * Custom log format for structured JSON output
 */
const jsonFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf((info) => {
    const { timestamp, level, message, ...rest } = info;
    return JSON.stringify({
        '@timestamp': timestamp,
        level,
        message,
        correlation_id: currentCorrelationId,
        ...rest,
    });
}));
/**
 * Console format for development
 */
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.colorize(), winston_1.default.format.printf((info) => {
    const correlationId = currentCorrelationId ? ` [${currentCorrelationId.slice(0, 8)}]` : '';
    const context = info.context ? ` ${JSON.stringify(info.context)}` : '';
    return `${info.timestamp} ${info.level}${correlationId}: ${info.message}${context}`;
}));
/**
 * Create logger instance
 */
function createLogger() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const logLevel = process.env.LOG_LEVEL || 'info';
    const transports = [
        new winston_1.default.transports.Console({
            level: logLevel,
            format: isDevelopment ? consoleFormat : jsonFormat,
        }),
    ];
    // Add file transport for production if needed
    if (!isDevelopment && process.env.LOG_FILE) {
        transports.push(new winston_1.default.transports.File({
            filename: process.env.LOG_FILE,
            level: logLevel,
            format: jsonFormat,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        }));
    }
    return winston_1.default.createLogger({
        level: logLevel,
        format: jsonFormat,
        transports,
        exitOnError: false,
    });
}
/**
 * Enhanced logger with context support
 */
class ContextualLogger {
    constructor() {
        this.winston = createLogger();
    }
    formatMessage(level, message, context) {
        const logEntry = {
            message,
            correlation_id: getCorrelationId(),
        };
        if (context) {
            // Sanitize sensitive information
            const sanitizedContext = this.sanitizeContext(context);
            Object.assign(logEntry, sanitizedContext);
        }
        this.winston.log(level, logEntry);
    }
    /**
     * Remove sensitive information from log context
     */
    sanitizeContext(context) {
        const sanitized = { ...context };
        // List of sensitive fields to redact
        const sensitiveFields = [
            'api_key',
            'token',
            'password',
            'secret',
            'auth',
            'authorization',
            'cookie',
            'session',
        ];
        for (const [key, value] of Object.entries(sanitized)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveFields.some(field => lowerKey.includes(field))) {
                sanitized[key] = '[REDACTED]';
            }
            else if (typeof value === 'string' && value.startsWith('sk-')) {
                // OpenAI API key pattern
                sanitized[key] = 'sk-[REDACTED]';
            }
            else if (typeof value === 'string' && value.length > 32 && /^[a-f0-9]+$/i.test(value)) {
                // Long hex strings (likely tokens)
                sanitized[key] = `${value.slice(0, 8)}...[REDACTED]`;
            }
        }
        return sanitized;
    }
    debug(message, context) {
        this.formatMessage('debug', message, context);
    }
    info(message, context) {
        this.formatMessage('info', message, context);
    }
    warn(message, context) {
        this.formatMessage('warn', message, context);
    }
    error(message, context) {
        this.formatMessage('error', message, context);
    }
    /**
     * Log with custom level
     */
    log(level, message, context) {
        this.formatMessage(level, message, context);
    }
    /**
     * Create child logger with default context
     */
    child(defaultContext) {
        return new ChildLogger(this, defaultContext);
    }
    /**
     * Log performance metrics
     */
    performance(operation, durationMs, context) {
        this.info(`Performance: ${operation}`, {
            operation,
            duration_ms: durationMs,
            ...context,
        });
    }
    /**
     * Log security events
     */
    security(event, context) {
        this.warn(`Security: ${event}`, {
            security_event: event,
            ...context,
        });
    }
    /**
     * Log audit events
     */
    audit(action, context) {
        this.info(`Audit: ${action}`, {
            audit_action: action,
            ...context,
        });
    }
    /**
     * Get current log level
     */
    getLevel() {
        return this.winston.level;
    }
    /**
     * Set log level
     */
    setLevel(level) {
        this.winston.level = level;
        this.winston.transports.forEach(transport => {
            transport.level = level;
        });
    }
}
/**
 * Child logger with inherited context
 */
class ChildLogger {
    constructor(parent, defaultContext) {
        this.parent = parent;
        this.defaultContext = defaultContext;
    }
    mergeContext(context) {
        return { ...this.defaultContext, ...context };
    }
    debug(message, context) {
        this.parent.debug(message, this.mergeContext(context));
    }
    info(message, context) {
        this.parent.info(message, this.mergeContext(context));
    }
    warn(message, context) {
        this.parent.warn(message, this.mergeContext(context));
    }
    error(message, context) {
        this.parent.error(message, this.mergeContext(context));
    }
    performance(operation, durationMs, context) {
        this.parent.performance(operation, durationMs, this.mergeContext(context));
    }
    security(event, context) {
        this.parent.security(event, this.mergeContext(context));
    }
    audit(action, context) {
        this.parent.audit(action, this.mergeContext(context));
    }
}
/**
 * Performance measurement utility
 */
class PerformanceTimer {
    constructor(operation, context = {}) {
        this.operation = operation;
        this.context = context;
        this.startTime = Date.now();
    }
    /**
     * End timing and log performance
     */
    end(additionalContext) {
        const duration = Date.now() - this.startTime;
        exports.logger.performance(this.operation, duration, {
            ...this.context,
            ...additionalContext,
        });
        return duration;
    }
    /**
     * Get current duration without ending
     */
    getDuration() {
        return Date.now() - this.startTime;
    }
}
exports.PerformanceTimer = PerformanceTimer;
/**
 * Performance measurement decorator
 */
function measurePerformance(operation, context) {
    return function (_target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const timer = new PerformanceTimer(operation, {
                method: propertyKey,
                ...context,
            });
            try {
                const result = await originalMethod.apply(this, args);
                timer.end({ success: true });
                return result;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                timer.end({ success: false, error: errorMessage });
                throw error;
            }
        };
    };
}
/**
 * Session-aware logging utility
 */
function createSessionLogger(sessionId) {
    return exports.logger.child({ session_id: sessionId });
}
/**
 * Service call logging utility
 */
function createServiceCallLogger(callId, sessionId) {
    return exports.logger.child({
        call_id: callId,
        ...(sessionId && { session_id: sessionId }),
    });
}
/**
 * Request logging utility
 */
function createRequestLogger(requestId) {
    return exports.logger.child({
        request_id: requestId,
        correlation_id: getCorrelationId(),
    });
}
// Global logger instance
exports.logger = new ContextualLogger();
// Set up graceful shutdown logging
process.on('SIGTERM', () => {
    exports.logger.info('Received SIGTERM, shutting down gracefully');
});
process.on('SIGINT', () => {
    exports.logger.info('Received SIGINT, shutting down gracefully');
});
// Log unhandled errors
process.on('uncaughtException', (error) => {
    exports.logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    exports.logger.error('Unhandled promise rejection', {
        reason: String(reason),
        promise: String(promise),
    });
});
exports.default = exports.logger;
//# sourceMappingURL=logging.js.map