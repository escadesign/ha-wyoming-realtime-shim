/**
 * Logging Infrastructure
 * Structured JSON logging with correlation IDs and context
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { LogLevel, LogContext } from './types';

// Correlation ID for tracking requests across components
let currentCorrelationId: string | null = null;

/**
 * Get or generate correlation ID for current context
 */
export function getCorrelationId(): string {
  if (!currentCorrelationId) {
    currentCorrelationId = uuidv4();
  }
  return currentCorrelationId;
}

/**
 * Set correlation ID for current context
 */
export function setCorrelationId(id: string): void {
  currentCorrelationId = id;
}

/**
 * Clear correlation ID
 */
export function clearCorrelationId(): void {
  currentCorrelationId = null;
}

/**
 * Run function with specific correlation ID
 */
export function withCorrelationId<T>(id: string, fn: () => T): T {
  const previousId = currentCorrelationId;
  setCorrelationId(id);
  try {
    return fn();
  } finally {
    currentCorrelationId = previousId;
  }
}

/**
 * Custom log format for structured JSON output
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...rest } = info;
    return JSON.stringify({
      '@timestamp': timestamp,
      level,
      message,
      correlation_id: currentCorrelationId,
      ...rest,
    });
  })
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const correlationId = currentCorrelationId ? ` [${currentCorrelationId.slice(0, 8)}]` : '';
    const context = info.context ? ` ${JSON.stringify(info.context)}` : '';
    return `${info.timestamp} ${info.level}${correlationId}: ${info.message}${context}`;
  })
);

/**
 * Create logger instance
 */
function createLogger(): winston.Logger {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logLevel = process.env.LOG_LEVEL || 'info';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: logLevel,
      format: isDevelopment ? consoleFormat : jsonFormat,
    }),
  ];

  // Add file transport for production if needed
  if (!isDevelopment && process.env.LOG_FILE) {
    transports.push(
      new winston.transports.File({
        filename: process.env.LOG_FILE,
        level: logLevel,
        format: jsonFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      })
    );
  }

  return winston.createLogger({
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
  private winston: winston.Logger;

  constructor() {
    this.winston = createLogger();
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): void {
    const logEntry: Record<string, unknown> = {
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
  private sanitizeContext(context: LogContext): LogContext {
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
      } else if (typeof value === 'string' && value.startsWith('sk-')) {
        // OpenAI API key pattern
        sanitized[key] = 'sk-[REDACTED]';
      } else if (typeof value === 'string' && value.length > 32 && /^[a-f0-9]+$/i.test(value)) {
        // Long hex strings (likely tokens)
        sanitized[key] = `${value.slice(0, 8)}...[REDACTED]`;
      }
    }

    return sanitized;
  }

  debug(message: string, context?: LogContext): void {
    this.formatMessage('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.formatMessage('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.formatMessage('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.formatMessage('error', message, context);
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    this.formatMessage(level, message, context);
  }

  /**
   * Create child logger with default context
   */
  child(defaultContext: LogContext): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, durationMs: number, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration_ms: durationMs,
      ...context,
    });
  }

  /**
   * Log security events
   */
  security(event: string, context?: LogContext): void {
    this.warn(`Security: ${event}`, {
      security_event: event,
      ...context,
    });
  }

  /**
   * Log audit events
   */
  audit(action: string, context?: LogContext): void {
    this.info(`Audit: ${action}`, {
      audit_action: action,
      ...context,
    });
  }

  /**
   * Get current log level
   */
  getLevel(): string {
    return this.winston.level;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
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
  constructor(
    private parent: ContextualLogger,
    private defaultContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.defaultContext, ...context };
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  error(message: string, context?: LogContext): void {
    this.parent.error(message, this.mergeContext(context));
  }

  performance(operation: string, durationMs: number, context?: LogContext): void {
    this.parent.performance(operation, durationMs, this.mergeContext(context));
  }

  security(event: string, context?: LogContext): void {
    this.parent.security(event, this.mergeContext(context));
  }

  audit(action: string, context?: LogContext): void {
    this.parent.audit(action, this.mergeContext(context));
  }
}

/**
 * Performance measurement utility
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private context: LogContext;

  constructor(operation: string, context: LogContext = {}) {
    this.operation = operation;
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * End timing and log performance
   */
  end(additionalContext?: LogContext): number {
    const duration = Date.now() - this.startTime;
    logger.performance(this.operation, duration, {
      ...this.context,
      ...additionalContext,
    });
    return duration;
  }

  /**
   * Get current duration without ending
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Performance measurement decorator
 */
export function measurePerformance(operation: string, context?: LogContext) {
  return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): void {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const timer = new PerformanceTimer(operation, {
        method: propertyKey,
        ...context,
      });

      try {
        const result = await originalMethod.apply(this, args);
        timer.end({ success: true });
        return result;
      } catch (error) {
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
export function createSessionLogger(sessionId: string): ChildLogger {
  return logger.child({ session_id: sessionId });
}

/**
 * Service call logging utility
 */
export function createServiceCallLogger(callId: string, sessionId?: string): ChildLogger {
  return logger.child({
    call_id: callId,
    ...(sessionId && { session_id: sessionId }),
  });
}

/**
 * Request logging utility
 */
export function createRequestLogger(requestId: string): ChildLogger {
  return logger.child({
    request_id: requestId,
    correlation_id: getCorrelationId(),
  });
}

// Global logger instance
export const logger = new ContextualLogger();

// Set up graceful shutdown logging
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
});

// Log unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: String(reason),
    promise: String(promise),
  });
});

export default logger;
