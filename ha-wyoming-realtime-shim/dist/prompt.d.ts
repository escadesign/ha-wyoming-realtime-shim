/**
 * OpenAI System Prompts
 * System instructions and function schemas for Home Assistant integration
 */
import { Tool, Configuration } from './types';
/**
 * Generate system instructions for the OpenAI model
 */
export declare function generateSystemInstructions(config: Configuration): string;
/**
 * Generate function tools for Home Assistant integration
 */
export declare function generateFunctionTools(config: Configuration): Tool[];
/**
 * Generate confirmation prompts for high-risk actions
 */
export declare function generateConfirmationPrompt(domain: string, service: string, entityId?: string, data?: Record<string, unknown>): string;
/**
 * Generate voice responses for different scenarios
 */
export declare class VoiceResponseGenerator {
    private config;
    constructor(config: Configuration);
    /**
     * Generate response for successful service call
     */
    generateSuccessResponse(domain: string, service: string, entityId?: string): string;
    /**
     * Generate response for errors
     */
    generateErrorResponse(error: string, domain?: string, entityId?: string): string;
    /**
     * Generate response for state queries
     */
    generateStateResponse(entity: any): string;
}
/**
 * Default conversation starters and examples
 */
export declare const CONVERSATION_EXAMPLES: string[];
/**
 * Error messages for common issues
 */
export declare const ERROR_MESSAGES: {
    DOMAIN_NOT_ALLOWED: string;
    ENTITY_NOT_FOUND: string;
    CONFIRMATION_REQUIRED: string;
    NETWORK_ERROR: string;
    AUDIO_ERROR: string;
    TIMEOUT_ERROR: string;
};
declare const _default: {
    generateSystemInstructions: typeof generateSystemInstructions;
    generateFunctionTools: typeof generateFunctionTools;
    generateConfirmationPrompt: typeof generateConfirmationPrompt;
    VoiceResponseGenerator: typeof VoiceResponseGenerator;
    CONVERSATION_EXAMPLES: string[];
    ERROR_MESSAGES: {
        DOMAIN_NOT_ALLOWED: string;
        ENTITY_NOT_FOUND: string;
        CONFIRMATION_REQUIRED: string;
        NETWORK_ERROR: string;
        AUDIO_ERROR: string;
        TIMEOUT_ERROR: string;
    };
};
export default _default;
//# sourceMappingURL=prompt.d.ts.map