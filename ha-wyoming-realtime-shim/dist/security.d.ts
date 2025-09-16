/**
 * Security Controller
 * Handles domain whitelist, entity whitelist, and confirmation flows
 */
import { SecurityValidation, SecurityConfig, AuditLogEntry, HAServiceCallRequest } from './types';
export declare class SecurityController {
    private config;
    private auditEntries;
    constructor(config: SecurityConfig);
    /**
     * Validate if a service call is allowed
     */
    validateServiceCall(serviceCall: HAServiceCallRequest & {
        confirmed?: boolean;
    }): Promise<SecurityValidation>;
    /**
     * Check if action is considered high-risk
     */
    private isHighRiskAction;
    /**
     * Generate confirmation prompt for high-risk actions
     */
    private generateConfirmationPrompt;
    /**
     * Sanitize entity ID to prevent injection attacks
     */
    private sanitizeEntityId;
    /**
     * Log audit entry
     */
    addAuditEntry(entry: Omit<AuditLogEntry, 'timestamp'>): void;
    /**
     * Get recent audit log entries
     */
    getAuditLog(limit?: number): AuditLogEntry[];
    /**
     * Update security configuration
     */
    updateConfig(newConfig: Partial<SecurityConfig>): void;
    /**
     * Get current security configuration (without sensitive data)
     */
    getConfig(): SecurityConfig;
}
//# sourceMappingURL=security.d.ts.map