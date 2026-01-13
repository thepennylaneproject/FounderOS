'use client';

/**
 * Audit Logging Service
 * 
 * Tracks user actions for compliance, debugging, and analytics.
 * Logs are stored locally and can be synced to the server.
 */

export type AuditAction =
    | 'contact_created'
    | 'contact_updated'
    | 'contact_deleted'
    | 'domain_added'
    | 'domain_verified'
    | 'domain_removed'
    | 'campaign_created'
    | 'campaign_sent'
    | 'campaign_paused'
    | 'campaign_deleted'
    | 'workflow_created'
    | 'workflow_enabled'
    | 'workflow_disabled'
    | 'email_drafted'
    | 'email_sent'
    | 'settings_changed'
    | 'user_login'
    | 'user_logout'
    | 'export_data'
    | 'import_data';

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    action: AuditAction;
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, any>;
    metadata?: {
        ip?: string;
        userAgent?: string;
        sessionId?: string;
    };
}

const AUDIT_LOG_KEY = 'founderos_audit_log';
const MAX_LOCAL_ENTRIES = 500;

class AuditLogService {
    private queue: AuditLogEntry[] = [];
    private isSyncing = false;

    /**
     * Log an action to the audit trail.
     */
    log(
        action: AuditAction,
        options: {
            resourceType?: string;
            resourceId?: string;
            details?: Record<string, any>;
            userId?: string;
        } = {}
    ): void {
        const entry: AuditLogEntry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            action,
            ...options,
            metadata: {
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
                sessionId: this.getSessionId(),
            },
        };

        // Add to local queue
        this.queue.push(entry);

        // Store locally
        this.persistToLocal(entry);

        // Attempt to sync (non-blocking)
        this.syncToServer();

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('[Audit]', action, options);
        }
    }

    /**
     * Get recent audit log entries.
     */
    getRecentLogs(limit = 50): AuditLogEntry[] {
        if (typeof window === 'undefined') return [];

        try {
            const stored = localStorage.getItem(AUDIT_LOG_KEY);
            if (!stored) return [];

            const entries: AuditLogEntry[] = JSON.parse(stored);
            return entries.slice(-limit);
        } catch {
            return [];
        }
    }

    /**
     * Get logs for a specific resource.
     */
    getLogsForResource(resourceType: string, resourceId: string): AuditLogEntry[] {
        return this.getRecentLogs(MAX_LOCAL_ENTRIES).filter(
            entry => entry.resourceType === resourceType && entry.resourceId === resourceId
        );
    }

    /**
     * Clear local audit logs.
     */
    clearLocalLogs(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(AUDIT_LOG_KEY);
        this.queue = [];
    }

    /**
     * Export audit logs as JSON.
     */
    exportLogs(): string {
        const logs = this.getRecentLogs(MAX_LOCAL_ENTRIES);
        return JSON.stringify(logs, null, 2);
    }

    private persistToLocal(entry: AuditLogEntry): void {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(AUDIT_LOG_KEY);
            const entries: AuditLogEntry[] = stored ? JSON.parse(stored) : [];

            entries.push(entry);

            // Trim to max entries
            const trimmed = entries.slice(-MAX_LOCAL_ENTRIES);

            localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed));
        } catch (err) {
            console.warn('Failed to persist audit log:', err);
        }
    }

    private async syncToServer(): Promise<void> {
        if (this.isSyncing || this.queue.length === 0) return;

        this.isSyncing = true;
        const toSync = [...this.queue];

        try {
            const response = await fetch('/api/audit-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: toSync }),
            });

            if (response.ok) {
                // Remove synced entries from queue
                this.queue = this.queue.filter(e => !toSync.includes(e));
            }
        } catch {
            // Silently fail - logs are still stored locally
        } finally {
            this.isSyncing = false;
        }
    }

    private generateId(): string {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getSessionId(): string {
        if (typeof window === 'undefined') return '';

        let sessionId = sessionStorage.getItem('founderos_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('founderos_session_id', sessionId);
        }
        return sessionId;
    }
}

// Singleton instance
export const auditLog = new AuditLogService();

// React hook for easy access
export function useAuditLog() {
    return auditLog;
}

// Helper for common patterns
export const audit = {
    contactCreated: (contactId: string, details?: Record<string, any>) =>
        auditLog.log('contact_created', { resourceType: 'contact', resourceId: contactId, details }),
    
    contactUpdated: (contactId: string, details?: Record<string, any>) =>
        auditLog.log('contact_updated', { resourceType: 'contact', resourceId: contactId, details }),
    
    contactDeleted: (contactId: string) =>
        auditLog.log('contact_deleted', { resourceType: 'contact', resourceId: contactId }),
    
    domainAdded: (domain: string) =>
        auditLog.log('domain_added', { resourceType: 'domain', resourceId: domain }),
    
    campaignCreated: (campaignId: string, name: string) =>
        auditLog.log('campaign_created', { resourceType: 'campaign', resourceId: campaignId, details: { name } }),
    
    campaignSent: (campaignId: string, recipientCount: number) =>
        auditLog.log('campaign_sent', { resourceType: 'campaign', resourceId: campaignId, details: { recipientCount } }),
    
    emailDrafted: (contactId: string) =>
        auditLog.log('email_drafted', { resourceType: 'contact', resourceId: contactId }),
    
    exportData: (type: string, count: number) =>
        auditLog.log('export_data', { details: { type, count } }),
};
