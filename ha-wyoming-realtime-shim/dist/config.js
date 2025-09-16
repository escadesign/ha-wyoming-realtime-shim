"use strict";
/**
 * Configuration Management
 * Handles add-on configuration loading, validation, and environment setup
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configManager = exports.ConfigManager = void 0;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const logging_1 = require("./logging");
const configSchema = {
    type: 'object',
    properties: {
        openaiApiKey: {
            type: 'string',
            pattern: '^sk-[a-zA-Z0-9\\-_]{32,}$',
            description: 'OpenAI API key starting with sk-',
        },
        realtimeApiUrl: {
            type: 'string',
            format: 'uri',
            pattern: '^wss?://',
            description: 'WebSocket URL for OpenAI Realtime API',
        },
        model: {
            type: 'string',
            enum: ['gpt-realtime'],
            description: 'OpenAI model to use',
        },
        haUrl: {
            type: 'string',
            format: 'uri',
            pattern: '^wss?://',
            description: 'Home Assistant WebSocket URL',
        },
        haToken: {
            type: 'string',
            minLength: 32,
            description: 'Home Assistant long-lived access token',
        },
        allowedDomains: {
            type: 'array',
            items: {
                type: 'string',
                pattern: '^[a-z_]+$',
            },
            minItems: 0,
            uniqueItems: true,
            description: 'List of allowed Home Assistant domains',
        },
        entityWhitelist: {
            type: 'array',
            items: {
                type: 'string',
                pattern: '^[a-z_]+\\.[a-z0-9_]+$',
            },
            uniqueItems: true,
            description: 'List of specific entities allowed for control',
        },
        confirmHighRiskActions: {
            type: 'boolean',
            description: 'Require confirmation for potentially dangerous actions',
        },
        audioFormat: {
            type: 'string',
            enum: ['pcm16'],
            description: 'Audio format for capture and playback',
        },
        enableTtsMirror: {
            type: 'boolean',
            description: 'Enable TTS mirroring to media player',
        },
        ttsService: {
            type: 'string',
            description: 'TTS service to use for mirroring',
        },
        ttsMediaPlayer: {
            type: 'string',
            description: 'Media player entity for TTS output',
        },
        httpPort: {
            type: 'integer',
            minimum: 1024,
            maximum: 65535,
            description: 'HTTP server port for control API',
        },
        vadEnabledDefault: {
            type: 'boolean',
            description: 'Enable voice activity detection by default',
        },
        sessionSilenceTimeoutMs: {
            type: 'integer',
            minimum: 1000,
            maximum: 600000,
            description: 'Silence timeout in milliseconds',
        },
        sessionMaxDurationMs: {
            type: 'integer',
            minimum: 10000,
            maximum: 1800000,
            description: 'Maximum session duration in milliseconds',
        },
    },
    required: [
        'openaiApiKey',
        'realtimeApiUrl',
        'model',
        'haUrl',
        'haToken',
        'allowedDomains',
        'entityWhitelist',
        'confirmHighRiskActions',
        'audioFormat',
        'enableTtsMirror',
        'ttsService',
        'ttsMediaPlayer',
        'httpPort',
        'vadEnabledDefault',
        'sessionSilenceTimeoutMs',
        'sessionMaxDurationMs',
    ],
    additionalProperties: false,
};
class ConfigManager {
    constructor() {
        this.config = null;
        this.ajv = new ajv_1.default({ allErrors: true, strict: true });
        (0, ajv_formats_1.default)(this.ajv);
    }
    /**
     * Load configuration from environment variables and HA add-on options
     */
    async loadConfiguration() {
        try {
            logging_1.logger.info('Loading configuration from environment variables');
            const config = {
                // OpenAI Settings
                openaiApiKey: this.getRequiredEnv('OPENAI_API_KEY'),
                realtimeApiUrl: this.getEnv('REALTIME_API_URL', 'wss://api.openai.com/v1/realtime'),
                model: this.getEnv('MODEL', 'gpt-realtime'),
                // Home Assistant Settings
                haUrl: this.getRequiredEnv('HA_URL'),
                haToken: this.getRequiredEnv('HA_TOKEN'),
                // Security Settings
                allowedDomains: this.parseJsonArray('ALLOWED_DOMAINS', ['light', 'switch', 'climate']),
                entityWhitelist: this.parseJsonArray('ENTITY_WHITELIST', []),
                confirmHighRiskActions: this.getEnvBoolean('CONFIRM_HIGH_RISK_ACTIONS', true),
                // Audio Settings
                audioFormat: this.getEnv('AUDIO_FORMAT', 'pcm16'),
                // TTS Settings
                enableTtsMirror: this.getEnvBoolean('ENABLE_TTS_MIRROR', false),
                ttsService: this.getEnv('TTS_SERVICE', 'tts.piper'),
                ttsMediaPlayer: this.getEnv('TTS_MEDIA_PLAYER', ''),
                // Server Settings
                httpPort: this.getEnvNumber('HTTP_PORT', 5000),
                // Voice Settings
                vadEnabledDefault: this.getEnvBoolean('VAD_ENABLED_DEFAULT', false),
                sessionSilenceTimeoutMs: this.getEnvNumber('SESSION_SILENCE_TIMEOUT_MS', 30000),
                sessionMaxDurationMs: this.getEnvNumber('SESSION_MAX_DURATION_MS', 300000),
            };
            await this.validateConfiguration(config);
            this.config = config;
            logging_1.logger.info('Configuration loaded and validated successfully', {
                model: config.model,
                httpPort: config.httpPort,
                allowedDomains: config.allowedDomains,
                vadEnabledDefault: config.vadEnabledDefault,
            });
            return config;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logging_1.logger.error('Failed to load configuration', { error: errorMessage });
            throw new Error(`Configuration loading failed: ${errorMessage}`);
        }
    }
    /**
     * Validate configuration against schema
     */
    async validateConfiguration(config) {
        const validate = this.ajv.compile(configSchema);
        const valid = validate(config);
        if (!valid) {
            const errors = validate.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ');
            throw new Error(`Configuration validation failed: ${errors}`);
        }
        // Additional custom validations
        await this.performCustomValidations(config);
    }
    /**
     * Perform additional custom validations beyond schema
     */
    async performCustomValidations(config) {
        // Validate OpenAI API key format
        if (!config.openaiApiKey.startsWith('sk-')) {
            throw new Error('OpenAI API key must start with "sk-"');
        }
        // Validate URL formats
        try {
            new URL(config.realtimeApiUrl);
            new URL(config.haUrl);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Invalid URL format: ${errorMessage}`);
        }
        // Validate domain names
        const validDomainPattern = /^[a-z_]+$/;
        for (const domain of config.allowedDomains) {
            if (!validDomainPattern.test(domain)) {
                throw new Error(`Invalid domain name: ${domain}`);
            }
        }
        // Validate entity IDs
        const validEntityPattern = /^[a-z_]+\.[a-z0-9_]+$/;
        for (const entity of config.entityWhitelist) {
            if (!validEntityPattern.test(entity)) {
                throw new Error(`Invalid entity ID: ${entity}`);
            }
        }
        // Validate timeout values
        if (config.sessionSilenceTimeoutMs >= config.sessionMaxDurationMs) {
            throw new Error('Session silence timeout must be less than maximum duration');
        }
        // Validate port availability
        if (config.httpPort < 1024 || config.httpPort > 65535) {
            throw new Error(`HTTP port must be between 1024 and 65535, got ${config.httpPort}`);
        }
        logging_1.logger.debug('Custom configuration validations passed');
    }
    /**
     * Get current configuration
     */
    getConfiguration() {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfiguration() first.');
        }
        return this.config;
    }
    /**
     * Check if configuration is loaded
     */
    isLoaded() {
        return this.config !== null;
    }
    /**
     * Reload configuration
     */
    async reloadConfiguration() {
        logging_1.logger.info('Reloading configuration');
        this.config = null;
        return this.loadConfiguration();
    }
    /**
     * Get required environment variable
     */
    getRequiredEnv(name) {
        const value = process.env[name];
        if (!value) {
            throw new Error(`Required environment variable ${name} is not set`);
        }
        return value;
    }
    /**
     * Get optional environment variable with default
     */
    getEnv(name, defaultValue) {
        return process.env[name] || defaultValue;
    }
    /**
     * Get environment variable as boolean
     */
    getEnvBoolean(name, defaultValue) {
        const value = process.env[name];
        if (!value)
            return defaultValue;
        return value.toLowerCase() === 'true' || value === '1';
    }
    /**
     * Get environment variable as number
     */
    getEnvNumber(name, defaultValue) {
        const value = process.env[name];
        if (!value)
            return defaultValue;
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
            throw new Error(`Environment variable ${name} must be a number, got: ${value}`);
        }
        return parsed;
    }
    /**
     * Parse JSON array from environment variable
     */
    parseJsonArray(name, defaultValue) {
        const value = process.env[name];
        if (!value)
            return defaultValue;
        try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
                throw new Error(`Environment variable ${name} must be a JSON array`);
            }
            return parsed;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to parse JSON array from ${name}: ${errorMessage}`);
        }
    }
    /**
     * Get configuration summary for logging (without secrets)
     */
    getConfigSummary() {
        if (!this.config) {
            return { status: 'not_loaded' };
        }
        return {
            model: this.config.model,
            httpPort: this.config.httpPort,
            allowedDomains: this.config.allowedDomains,
            entityWhitelistCount: this.config.entityWhitelist.length,
            confirmHighRiskActions: this.config.confirmHighRiskActions,
            vadEnabledDefault: this.config.vadEnabledDefault,
            sessionSilenceTimeoutMs: this.config.sessionSilenceTimeoutMs,
            sessionMaxDurationMs: this.config.sessionMaxDurationMs,
            enableTtsMirror: this.config.enableTtsMirror,
        };
    }
}
exports.ConfigManager = ConfigManager;
// Global configuration manager instance
exports.configManager = new ConfigManager();
//# sourceMappingURL=config.js.map