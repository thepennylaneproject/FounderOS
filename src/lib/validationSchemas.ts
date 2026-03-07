/**
 * Zod validation schemas for API endpoints
 * Ensures type-safe input validation across all routes
 */

import { z } from 'zod';

// Campaign schemas
export const createCampaignSchema = z.object({
    name: z.string().min(1, 'Campaign name is required').max(255),
    type: z.enum(['marketing', 'transactional', 'automated']),
    subject: z.string().min(1, 'Subject is required').max(500),
    body: z.string().min(1, 'Body content is required'),
    status: z.enum(['draft', 'active', 'completed', 'paused']).optional().default('draft'),
    template_id: z.string().uuid().optional(),
    target_segments: z.array(z.string().uuid()).optional(),
    scheduled_at: z.string().datetime().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema.partial();
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

// Contact schemas
export const createContactSchema = z.object({
    email: z.string().email('Valid email address required'),
    first_name: z.string().min(1, 'First name required'),
    last_name: z.string().min(1, 'Last name required'),
    company_name: z.string().optional(),
    industry: z.string().optional(),
    stage: z.enum(['lead', 'prospect', 'customer', 'churned']).optional().default('lead'),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;

// Email schemas
export const sendEmailSchema = z.object({
    from: z.string().email().optional(),
    to: z.string().email('Valid recipient email required'),
    subject: z.string().min(1, 'Subject required').max(500),
    body: z.string().min(1, 'Body required'),
    domainId: z.string().uuid().optional(),
    contactId: z.string().uuid().optional(),
    campaignId: z.string().uuid().optional(),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;

// Rule schemas
export const createRuleSchema = z.object({
    enabled: z.boolean().default(true),
    priority: z.number().int().min(0).max(1000).default(100),
    match: z.record(z.any()).default({}),
    action: z.record(z.any()).default({}),
    reason_template: z.string().default('Routed because: rule match'),
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;

export const updateRuleSchema = createRuleSchema.partial().extend({
    id: z.string().uuid('Valid rule ID required'),
});

export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

// Pagination schemas
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Helper function to validate and extract pagination params from query string
 */
export function extractPagination(searchParams: URLSearchParams): PaginationInput {
    return paginationSchema.parse({
        page: searchParams.get('page'),
        pageSize: searchParams.get('pageSize'),
    });
}
