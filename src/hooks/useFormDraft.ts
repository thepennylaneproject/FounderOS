'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseFormDraftOptions<T> {
    /** Unique key to store the draft under in localStorage */
    key: string;
    /** Initial/default values for the form */
    initialValues: T;
    /** Debounce delay in ms before saving to localStorage (default: 500) */
    debounceMs?: number;
}

interface UseFormDraftReturn<T> {
    /** Current form values */
    values: T;
    /** Update a single field */
    setValue: <K extends keyof T>(field: K, value: T[K]) => void;
    /** Update multiple fields at once */
    setValues: (updates: Partial<T>) => void;
    /** Clear the draft from localStorage */
    clearDraft: () => void;
    /** Whether a draft was restored from localStorage */
    hasRestoredDraft: boolean;
    /** Whether the form has unsaved changes */
    isDirty: boolean;
}

/**
 * A hook that persists form state to localStorage to prevent data loss on refresh.
 * 
 * @example
 * const { values, setValue, clearDraft, hasRestoredDraft } = useFormDraft({
 *   key: 'add-contact-form',
 *   initialValues: { firstName: '', lastName: '', email: '' }
 * });
 */
export function useFormDraft<T extends Record<string, any>>({
    key,
    initialValues,
    debounceMs = 500,
}: UseFormDraftOptions<T>): UseFormDraftReturn<T> {
    const storageKey = `founderos_draft_${key}`;
    
    const [values, setValuesState] = useState<T>(initialValues);
    const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Restore draft on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                setValuesState(parsed);
                setHasRestoredDraft(true);
                setIsDirty(true);
            }
        } catch (e) {
            console.warn('Failed to restore form draft:', e);
        }
    }, [storageKey]);

    // Save draft to localStorage with debounce
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isDirty) return;

        const timeout = setTimeout(() => {
            try {
                localStorage.setItem(storageKey, JSON.stringify(values));
            } catch (e) {
                console.warn('Failed to save form draft:', e);
            }
        }, debounceMs);

        return () => clearTimeout(timeout);
    }, [values, storageKey, debounceMs, isDirty]);

    const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
        setValuesState(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    }, []);

    const setValues = useCallback((updates: Partial<T>) => {
        setValuesState(prev => ({ ...prev, ...updates }));
        setIsDirty(true);
    }, []);

    const clearDraft = useCallback(() => {
        if (typeof window === 'undefined') return;
        
        try {
            localStorage.removeItem(storageKey);
        } catch (e) {
            console.warn('Failed to clear form draft:', e);
        }
        setValuesState(initialValues);
        setHasRestoredDraft(false);
        setIsDirty(false);
    }, [storageKey, initialValues]);

    return {
        values,
        setValue,
        setValues,
        clearDraft,
        hasRestoredDraft,
        isDirty,
    };
}
