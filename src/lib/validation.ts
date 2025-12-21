// Form validation utilities

export interface ValidationError {
    field: string;
    message: string;
}

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validateDomain = (domain: string): boolean => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
};

export const validateContactForm = (data: {
    email: string;
    first_name: string;
    last_name: string;
}): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.first_name?.trim()) {
        errors.push({ field: 'first_name', message: 'First name is required' });
    }

    if (!data.last_name?.trim()) {
        errors.push({ field: 'last_name', message: 'Last name is required' });
    }

    if (!data.email?.trim()) {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!validateEmail(data.email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }

    return errors;
};

export const validateDomainForm = (data: { domain_name: string }): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.domain_name?.trim()) {
        errors.push({ field: 'domain_name', message: 'Domain name is required' });
    } else if (!validateDomain(data.domain_name)) {
        errors.push({ field: 'domain_name', message: 'Please enter a valid domain (e.g., example.com)' });
    }

    return errors;
};

export const validateCampaignForm = (data: {
    name: string;
    subject: string;
    content: string;
}): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.name?.trim()) {
        errors.push({ field: 'name', message: 'Campaign name is required' });
    }

    if (!data.subject?.trim()) {
        errors.push({ field: 'subject', message: 'Subject line is required' });
    }

    if (!data.content?.trim()) {
        errors.push({ field: 'content', message: 'Email content is required' });
    } else if (data.content.length < 10) {
        errors.push({ field: 'content', message: 'Email content must be at least 10 characters' });
    }

    return errors;
};
