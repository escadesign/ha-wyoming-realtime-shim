/**
 * Security Controller
 * Handles domain whitelist, entity whitelist, and confirmation flows
 */

import { logger } from './logging';
import { SecurityValidation, SecurityConfig, AuditLogEntry, HAServiceCallRequest } from './types';

export class SecurityController {
  private config: SecurityConfig;
  private auditEntries: AuditLogEntry[] = [];

  constructor(config: SecurityConfig) {
    this.config = config;
    logger.info('Security controller initialized', {
      allowedDomains: config.allowedDomains,
      entityWhitelistCount: config.entityWhitelist.length,
      confirmHighRiskActions: config.confirmHighRiskActions,
    });
  }

  /**
   * Validate if a service call is allowed
   */
  async validateServiceCall(serviceCall: HAServiceCallRequest & { confirmed?: boolean }): Promise<SecurityValidation> {
    const validation: SecurityValidation = {
      allowed: false,
      requiresConfirmation: false,
    };

    try {
      // Check domain whitelist
      if (!this.config.allowedDomains.includes(serviceCall.domain)) {
        validation.reason = `Domain "${serviceCall.domain}" not allowed`;
        this.addAuditEntry({
          action: 'security_violation',
          violation_type: 'domain_not_allowed',
          domain: serviceCall.domain,
          service: serviceCall.service,
          entity_id: serviceCall.entity_id as string,
          allowed: false,
        });
        return validation;
      }

      // Check entity whitelist if configured and entity is specified
      if (this.config.entityWhitelist.length > 0 && serviceCall.entity_id) {
        const entityIds = Array.isArray(serviceCall.entity_id) ? serviceCall.entity_id : [serviceCall.entity_id];
        
        for (const entityId of entityIds) {
          if (!this.config.entityWhitelist.includes(entityId)) {
            validation.reason = `Entity "${entityId}" not allowed`;
            this.addAuditEntry({
              action: 'security_violation',
              violation_type: 'entity_not_allowed',
              domain: serviceCall.domain,
              service: serviceCall.service,
              entity_id: entityId,
              allowed: false,
            });
            return validation;
          }
        }
      }

      // Check if action requires confirmation
      const requiresConfirmation = this.isHighRiskAction(serviceCall);
      
      if (requiresConfirmation && this.config.confirmHighRiskActions) {
        if (!serviceCall.confirmed) {
          validation.requiresConfirmation = true;
          validation.confirmationPrompt = this.generateConfirmationPrompt(serviceCall);
          validation.allowed = false;
          validation.reason = 'Confirmation required for high-risk action';
          return validation;
        } else {
          this.addAuditEntry({
            action: 'high_risk_confirmed',
            domain: serviceCall.domain,
            service: serviceCall.service,
            entity_id: serviceCall.entity_id as string,
            allowed: true,
            confirmed: true,
          });
        }
      }

      // Sanitize entity ID if needed
      if (serviceCall.entity_id) {
        validation.sanitizedEntityId = this.sanitizeEntityId(serviceCall.entity_id as string);
      }

      validation.allowed = true;
      
      this.addAuditEntry({
        action: 'service_call_validation',
        domain: serviceCall.domain,
        service: serviceCall.service,
        entity_id: serviceCall.entity_id as string,
        allowed: true,
      });

      return validation;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Service call validation failed', {
        error: errorMessage,
        domain: serviceCall.domain,
        service: serviceCall.service,
      });

      validation.reason = `Validation error: ${errorMessage}`;
      return validation;
    }
  }

  /**
   * Check if action is considered high-risk
   */
  private isHighRiskAction(serviceCall: HAServiceCallRequest): boolean {
    const { domain, service, entity_id } = serviceCall;

    // High-risk domains
    const highRiskDomains = [
      'alarm_control_panel',
      'lock',
      'cover', // Garage doors, etc.
      'climate', // When controlling temperature significantly
      'vacuum', // If it affects cleaning schedules
    ];

    if (highRiskDomains.includes(domain)) {
      return true;
    }

    // High-risk actions
    const highRiskActions = [
      'turn_off',
      'unlock',
      'open_cover',
      'alarm_disarm',
    ];

    if (highRiskActions.includes(service)) {
      return true;
    }

    // Actions affecting all entities
    if (entity_id === 'all' || (Array.isArray(entity_id) && entity_id.length > 5)) {
      return true;
    }

    // Actions with significant impact
    if (service === 'set_temperature' && serviceCall.data) {
      const tempData = serviceCall.data as { temperature?: number };
      if (tempData.temperature && (tempData.temperature < 10 || tempData.temperature > 30)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate confirmation prompt for high-risk actions
   */
  private generateConfirmationPrompt(serviceCall: HAServiceCallRequest): string {
    const { domain, service, entity_id } = serviceCall;

    if (entity_id === 'all') {
      return `This will ${service.replace('_', ' ')} ALL ${domain} devices. Are you sure?`;
    }

    if (Array.isArray(entity_id) && entity_id.length > 1) {
      return `This will ${service.replace('_', ' ')} ${entity_id.length} ${domain} devices. Are you sure?`;
    }

    const entityName = entity_id && typeof entity_id === 'string' ? entity_id.replace(/^[^.]+\./, '').replace(/_/g, ' ') : 'device';
    
    switch (service) {
      case 'unlock':
        return `This will unlock the ${entityName}. Are you sure?`;
      case 'alarm_disarm':
        return `This will disarm the ${entityName}. Are you sure?`;
      case 'open_cover':
        return `This will open the ${entityName}. Are you sure?`;
      default:
        return `This will ${service.replace('_', ' ')} the ${entityName}. Are you sure?`;
    }
  }

  /**
   * Sanitize entity ID to prevent injection attacks
   */
  private sanitizeEntityId(entityId: string): string {
    // Remove potentially dangerous characters
    return entityId.replace(/[;&|`$(){}[\]\\]/g, '');
  }

  /**
   * Log audit entry
   */
  addAuditEntry(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    this.auditEntries.push(auditEntry);
    
    // Keep only last 1000 entries
    if (this.auditEntries.length > 1000) {
      this.auditEntries = this.auditEntries.slice(-1000);
    }

    // Log security violations
    if (!entry.allowed) {
      logger.security(`Security violation: ${entry.violation_type || 'unknown'}`, {
        domain: entry.domain || '',
        service: entry.service || '',
        entity_id: entry.entity_id || '',
        violation_type: entry.violation_type || '',
      });
    }
  }

  /**
   * Get recent audit log entries
   */
  getAuditLog(limit = 100): AuditLogEntry[] {
    return this.auditEntries.slice(-limit);
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    logger.info('Security configuration updated', {
      allowedDomains: this.config.allowedDomains,
      entityWhitelistCount: this.config.entityWhitelist.length,
    });

    this.addAuditEntry({
      action: 'security_config_updated',
      allowed: true,
    });
  }

  /**
   * Get current security configuration (without sensitive data)
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}
