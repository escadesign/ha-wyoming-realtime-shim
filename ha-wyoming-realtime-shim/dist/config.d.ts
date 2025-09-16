/**
 * Configuration Management
 * Handles add-on configuration loading, validation, and environment setup
 */
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
export declare class ConfigManager {
    private ajv;
    private config;
    constructor();
    /**
     * Load configuration from environment variables and HA add-on options
     */
    loadConfiguration(): Promise<Configuration>;
    /**
     * Validate configuration against schema
     */
    private validateConfiguration;
    /**
     * Perform additional custom validations beyond schema
     */
    private performCustomValidations;
    /**
     * Get current configuration
     */
    getConfiguration(): Configuration;
    /**
     * Check if configuration is loaded
     */
    isLoaded(): boolean;
    /**
     * Reload configuration
     */
    reloadConfiguration(): Promise<Configuration>;
    /**
     * Get required environment variable
     */
    private getRequiredEnv;
    /**
     * Get optional environment variable with default
     */
    private getEnv;
    /**
     * Get environment variable as boolean
     */
    private getEnvBoolean;
    /**
     * Get environment variable as number
     */
    private getEnvNumber;
    /**
     * Parse JSON array from environment variable
     */
    private parseJsonArray;
    /**
     * Get configuration summary for logging (without secrets)
     */
    getConfigSummary(): Record<string, unknown>;
}
export declare const configManager: ConfigManager;
//# sourceMappingURL=config.d.ts.map