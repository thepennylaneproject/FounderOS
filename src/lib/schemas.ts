import { z } from 'zod';

// ============================================
// Common Validators
// ============================================

export const emailSchema = z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .transform(email => email.trim());

export const domainSchema = z
    .string()
    .min(1, 'Domain is required')
    .regex(
        /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i,
        'Please enter a valid domain (e.g., example.com)'
    )
    .toLowerCase()
    .transform(domain => domain.trim());

export const urlSchema = z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal(''));

// ============================================
// Contact Schemas
// ============================================

export const contactFormSchema = z.object({
    email: emailSchema,
    first_name: z
        .string()
        .min(1, 'First name is required')
        .max(100, 'First name is too long')
        .transform(name => name.trim()),
    last_name: z
        .string()
        .min(1, 'Last name is required')
        .max(100, 'Last name is too long')
        .transform(name => name.trim()),
    company_name: z
        .string()
        .max(200, 'Company name is too long')
        .optional()
        .transform(name => name?.trim() || ''),
    stage: z.enum(['lead', 'prospect', 'customer', 'churned']).default('lead'),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// ============================================
// Domain Schemas
// ============================================

export const domainFormSchema = z.object({
    domain: domainSchema,
});

export type DomainFormData = z.infer<typeof domainFormSchema>;

// ============================================
// Campaign Schemas
// ============================================

export const campaignFormSchema = z.object({
    name: z
        .string()
        .min(1, 'Campaign name is required')
        .max(200, 'Campaign name is too long')
        .transform(name => name.trim()),
    subject: z
        .string()
        .min(1, 'Subject line is required')
        .max(998, 'Subject line is too long (max 998 characters for email compatibility)')
        .transform(subject => subject.trim()),
    from_name: z
        .string()
        .min(1, 'Sender name is required')
        .max(100, 'Sender name is too long')
        .transform(name => name.trim()),
    from_email: emailSchema,
    content: z
        .string()
        .min(1, 'Email content is required')
        .max(100000, 'Email content is too long'),
    audience_filter: z.record(z.string(), z.any()).optional(),
});

export type CampaignFormData = z.infer<typeof campaignFormSchema>;

// ============================================
// Automation/Workflow Schemas
// ============================================

export const workflowFormSchema = z.object({
    name: z
        .string()
        .min(1, 'Workflow name is required')
        .max(200, 'Workflow name is too long')
        .transform(name => name.trim()),
    trigger_type: z.enum(['contact_created', 'stage_changed', 'email_opened', 'link_clicked', 'manual']),
    trigger_config: z.record(z.string(), z.any()).optional(),
    actions: z.array(z.object({
        type: z.enum(['send_email', 'update_stage', 'add_tag', 'remove_tag', 'wait', 'webhook']),
        config: z.record(z.string(), z.any()),
        delay_minutes: z.number().min(0).optional(),
    })).min(1, 'At least one action is required'),
    is_active: z.boolean().default(false),
});

export type WorkflowFormData = z.infer<typeof workflowFormSchema>;

// ============================================
// Validation Helpers
// ============================================

export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: ValidationError[];
}

export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Validate data against a Zod schema and return structured errors.
 */
export function validateForm<T>(
    schema: z.ZodType<T>,
    data: unknown
): ValidationResult<T> {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors: ValidationError[] = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
    }));

    return { success: false, errors };
}

/**
 * Convert Zod errors to a field -> message map for form display.
 */
export function errorsToMap(errors: ValidationError[]): Record<string, string> {
    return Object.fromEntries(errors.map(err => [err.field, err.message]));
}

// ============================================
// API Request Validators (Server-side)
// ============================================

export const apiContactSchema = contactFormSchema.extend({
    user_id: z.string().uuid().optional(), // Added by server from auth
});

export const apiCampaignSchema = campaignFormSchema.extend({
    user_id: z.string().uuid().optional(),
    scheduled_at: z.string().datetime().optional(),
});

export const apiDomainSchema = domainFormSchema.extend({
    user_id: z.string().uuid().optional(),
});
