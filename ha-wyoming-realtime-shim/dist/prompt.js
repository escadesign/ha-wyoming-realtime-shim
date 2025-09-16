"use strict";
/**
 * OpenAI System Prompts
 * System instructions and function schemas for Home Assistant integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGES = exports.CONVERSATION_EXAMPLES = exports.VoiceResponseGenerator = void 0;
exports.generateSystemInstructions = generateSystemInstructions;
exports.generateFunctionTools = generateFunctionTools;
exports.generateConfirmationPrompt = generateConfirmationPrompt;
/**
 * Generate system instructions for the OpenAI model
 */
function generateSystemInstructions(config) {
    const allowedDomains = config.allowedDomains.join(', ');
    return `You are a helpful voice assistant for controlling a Home Assistant smart home system. You can understand natural language commands and translate them into appropriate device actions.

CAPABILITIES:
- Control devices in these domains: ${allowedDomains}
- Get current status of devices and sensors
- Respond with natural, conversational speech
- Confirm dangerous or high-impact actions before executing

IMPORTANT GUIDELINES:
1. Always respond in a friendly, helpful manner
2. Confirm high-risk actions (turning off all lights, unlocking doors, etc.) before executing
3. If asked to control devices outside allowed domains, politely explain you cannot access those systems
4. Provide clear feedback about what actions you're taking
5. If a command is unclear, ask for clarification rather than guessing

LANGUAGE SUPPORT:
- Respond in the same language the user speaks to you
- Support for English, German, Spanish, and French

SAFETY RULES:
- Never control security systems without explicit confirmation
- Always confirm before making changes that affect multiple devices
- If unsure about a command, ask for clarification rather than taking action`;
}
/**
 * Generate function tools for Home Assistant integration
 */
function generateFunctionTools(config) {
    const tools = [
        {
            type: 'function',
            name: 'call_service',
            description: 'Call a Home Assistant service to control devices or execute actions',
            parameters: {
                type: 'object',
                properties: {
                    domain: {
                        type: 'string',
                        description: `The service domain (allowed: ${config.allowedDomains.join(', ')})`,
                        enum: config.allowedDomains,
                    },
                    service: {
                        type: 'string',
                        description: 'The service name (e.g., turn_on, turn_off, set_temperature)',
                    },
                    entity_id: {
                        type: 'string',
                        description: 'The entity ID to control (optional for domain-wide services)',
                    },
                    data: {
                        type: 'object',
                        description: 'Additional service data like brightness, temperature, color',
                        properties: {
                            brightness: {
                                type: 'number',
                                minimum: 1,
                                maximum: 255,
                                description: 'Light brightness (1-255)',
                            },
                            brightness_pct: {
                                type: 'number',
                                minimum: 1,
                                maximum: 100,
                                description: 'Light brightness percentage (1-100)',
                            },
                            temperature: {
                                type: 'number',
                                minimum: 5,
                                maximum: 35,
                                description: 'Temperature in Celsius',
                            },
                            color_name: {
                                type: 'string',
                                description: 'Color name (red, blue, green, etc.)',
                            },
                            kelvin: {
                                type: 'number',
                                minimum: 2000,
                                maximum: 6500,
                                description: 'Color temperature in Kelvin',
                            },
                        },
                    },
                },
                required: ['domain', 'service'],
            },
        },
        {
            type: 'function',
            name: 'get_state',
            description: 'Get the current state and attributes of a Home Assistant entity',
            parameters: {
                type: 'object',
                properties: {
                    entity_id: {
                        type: 'string',
                        description: 'The entity ID to query (e.g., light.living_room)',
                    },
                },
                required: ['entity_id'],
            },
        },
    ];
    // Add domain-specific tools based on configuration
    if (config.allowedDomains.includes('climate')) {
        tools.push({
            type: 'function',
            name: 'set_climate',
            description: 'Control climate/thermostat devices with advanced options',
            parameters: {
                type: 'object',
                properties: {
                    entity_id: {
                        type: 'string',
                        description: 'Climate entity ID',
                    },
                    temperature: {
                        type: 'number',
                        minimum: 5,
                        maximum: 35,
                        description: 'Target temperature in Celsius',
                    },
                    hvac_mode: {
                        type: 'string',
                        enum: ['heat', 'cool', 'auto', 'off', 'heat_cool'],
                        description: 'HVAC operating mode',
                    },
                    fan_mode: {
                        type: 'string',
                        enum: ['auto', 'low', 'medium', 'high'],
                        description: 'Fan speed setting',
                    },
                },
                required: ['entity_id'],
            },
        });
    }
    if (config.allowedDomains.includes('media_player')) {
        tools.push({
            type: 'function',
            name: 'control_media',
            description: 'Control media players for music, TV, and audio',
            parameters: {
                type: 'object',
                properties: {
                    entity_id: {
                        type: 'string',
                        description: 'Media player entity ID',
                    },
                    action: {
                        type: 'string',
                        enum: ['play', 'pause', 'stop', 'next', 'previous', 'volume_up', 'volume_down'],
                        description: 'Media control action',
                    },
                    volume_level: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        description: 'Volume level (0.0 to 1.0)',
                    },
                },
                required: ['entity_id', 'action'],
            },
        });
    }
    return tools;
}
/**
 * Generate confirmation prompts for high-risk actions
 */
function generateConfirmationPrompt(domain, service, entityId, data) {
    const entityName = entityId ? entityId.replace(/^[^.]+\./, '').replace(/_/g, ' ') : 'device';
    switch (service) {
        case 'turn_off':
            if (entityId === 'all' || !entityId) {
                return `I'm about to turn off all ${domain} devices. This will affect multiple devices in your home. Should I proceed?`;
            }
            return `I'm about to turn off the ${entityName}. Should I proceed?`;
        case 'unlock':
            return `I'm about to unlock the ${entityName}. This is a security action. Are you sure you want me to proceed?`;
        case 'alarm_disarm':
            return `I'm about to disarm the ${entityName}. This will disable your security system. Are you sure?`;
        case 'open_cover':
            return `I'm about to open the ${entityName}. This could affect your home's security or privacy. Should I proceed?`;
        case 'set_temperature':
            if (data?.temperature) {
                const temp = data.temperature;
                if (temp < 10 || temp > 30) {
                    return `I'm about to set the temperature to ${temp}°C, which is quite ${temp < 10 ? 'cold' : 'warm'}. Are you sure?`;
                }
            }
            break;
        default:
            if (entityId === 'all' || (Array.isArray(entityId) && entityId.length > 3)) {
                return `I'm about to ${service.replace('_', ' ')} multiple devices. This will affect several devices in your home. Should I proceed?`;
            }
    }
    return `I'm about to ${service.replace('_', ' ')} the ${entityName}. Should I proceed?`;
}
/**
 * Generate voice responses for different scenarios
 */
class VoiceResponseGenerator {
    constructor(config) {
        this.config = config;
    }
    /**
     * Generate response for successful service call
     */
    generateSuccessResponse(domain, service, entityId) {
        const entityName = entityId ? entityId.replace(/^[^.]+\./, '').replace(/_/g, ' ') : `${domain} device`;
        const action = service.replace('_', ' ');
        const successPhrases = [
            `Done! I've ${action === 'turn on' ? 'turned on' : action === 'turn off' ? 'turned off' : action} the ${entityName}.`,
            `${entityName} ${action === 'turn on' ? 'is now on' : action === 'turn off' ? 'is now off' : 'has been updated'}.`,
            `All set! The ${entityName} ${action === 'turn on' ? 'is on' : action === 'turn off' ? 'is off' : 'has been changed'}.`,
        ];
        return successPhrases[Math.floor(Math.random() * successPhrases.length)] || 'Action completed successfully.';
    }
    /**
     * Generate response for errors
     */
    generateErrorResponse(error, domain, entityId) {
        if (error.includes('not found')) {
            return `I couldn't find that device. Please check if the ${entityId || 'device'} exists and try again.`;
        }
        if (error.includes('not allowed') || error.includes('domain')) {
            return `I'm not able to control ${domain || 'that type of'} device. I can only control ${this.config.allowedDomains.join(', ')} devices.`;
        }
        if (error.includes('confirmation')) {
            return 'This action requires confirmation. Please say yes or confirm to proceed.';
        }
        return `I'm sorry, I couldn't complete that action. There was an error: ${error}`;
    }
    /**
     * Generate response for state queries
     */
    generateStateResponse(entity) {
        const entityName = entity.entity_id.replace(/^[^.]+\./, '').replace(/_/g, ' ');
        const state = entity.state;
        const attributes = entity.attributes || {};
        if (entity.entity_id.startsWith('light.')) {
            if (state === 'on') {
                const brightness = attributes.brightness_pct || Math.round((attributes.brightness / 255) * 100);
                return `The ${entityName} is on${brightness ? ` at ${brightness}% brightness` : ''}.`;
            }
            else {
                return `The ${entityName} is off.`;
            }
        }
        if (entity.entity_id.startsWith('climate.')) {
            const temp = attributes.current_temperature;
            const target = attributes.temperature;
            const mode = attributes.hvac_mode;
            return `The ${entityName} is set to ${mode} mode${target ? ` with a target of ${target}°C` : ''}${temp ? `. The current temperature is ${temp}°C` : ''}.`;
        }
        if (entity.entity_id.startsWith('sensor.')) {
            const unit = attributes.unit_of_measurement || '';
            return `The ${entityName} is ${state}${unit ? ` ${unit}` : ''}.`;
        }
        return `The ${entityName} is ${state}.`;
    }
}
exports.VoiceResponseGenerator = VoiceResponseGenerator;
/**
 * Default conversation starters and examples
 */
exports.CONVERSATION_EXAMPLES = [
    'Turn on the living room lights',
    'Set the thermostat to 22 degrees',
    'Turn off all the lights',
    'What\'s the temperature in the bedroom?',
    'Dim the kitchen lights to 50%',
    'Turn on the blue lights in the living room',
    'Is the front door locked?',
    'Set the volume to 50% on the speakers',
];
/**
 * Error messages for common issues
 */
exports.ERROR_MESSAGES = {
    DOMAIN_NOT_ALLOWED: 'I can only control certain types of devices for security reasons.',
    ENTITY_NOT_FOUND: 'I couldn\'t find that device. Please check the name and try again.',
    CONFIRMATION_REQUIRED: 'This action requires confirmation. Please say "yes" or "confirm" to proceed.',
    NETWORK_ERROR: 'I\'m having trouble connecting to your smart home system. Please try again.',
    AUDIO_ERROR: 'I\'m having trouble with the audio system. Please check your microphone and speakers.',
    TIMEOUT_ERROR: 'The request took too long to complete. Please try again.',
};
exports.default = {
    generateSystemInstructions,
    generateFunctionTools,
    generateConfirmationPrompt,
    VoiceResponseGenerator,
    CONVERSATION_EXAMPLES: exports.CONVERSATION_EXAMPLES,
    ERROR_MESSAGES: exports.ERROR_MESSAGES,
};
//# sourceMappingURL=prompt.js.map