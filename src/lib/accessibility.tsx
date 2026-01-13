'use client';

import React from 'react';

/**
 * Skip to main content link for keyboard users.
 * Appears on focus for quick navigation past the sidebar.
 */
export const SkipLink: React.FC<{ href?: string }> = ({ href = '#main-content' }) => (
    <a
        href={href}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--ink)] focus:text-white focus:rounded-sm focus:text-sm focus:font-sans focus:font-bold focus:uppercase focus:tracking-widest focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--rose-gold)]"
    >
        Skip to main content
    </a>
);

/**
 * Visually hidden text for screen readers.
 */
export const VisuallyHidden: React.FC<{ children: React.ReactNode; as?: keyof JSX.IntrinsicElements }> = ({
    children,
    as: Component = 'span',
}) => (
    <Component className="sr-only">{children}</Component>
);

/**
 * Focus trap for modals and dialogs.
 * Prevents focus from escaping the container.
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
    React.useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0] as HTMLElement;
        const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable?.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable?.focus();
                }
            }
        };

        // Focus first element
        firstFocusable?.focus();

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [containerRef, isActive]);
}

/**
 * Announce messages to screen readers.
 */
export function useAnnounce() {
    const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement is read
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }, []);

    return announce;
}

/**
 * Hook to detect user's motion preference.
 */
export function usePrefersReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

    React.useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return prefersReducedMotion;
}

/**
 * Hook to detect user's color scheme preference.
 */
export function useColorScheme(): 'light' | 'dark' {
    const [colorScheme, setColorScheme] = React.useState<'light' | 'dark'>('light');

    React.useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setColorScheme(mediaQuery.matches ? 'dark' : 'light');

        const handler = (e: MediaQueryListEvent) => setColorScheme(e.matches ? 'dark' : 'light');
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return colorScheme;
}

/**
 * Keyboard shortcut hint for accessibility.
 */
export const KeyboardHint: React.FC<{
    keys: string[];
    label: string;
    className?: string;
}> = ({ keys, label, className = '' }) => (
    <span className={`inline-flex items-center gap-1 text-xs text-zinc-400 ${className}`}>
        <VisuallyHidden>{label}:</VisuallyHidden>
        {keys.map((key, i) => (
            <React.Fragment key={key}>
                <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-[10px] font-mono">
                    {key}
                </kbd>
                {i < keys.length - 1 && <span className="text-zinc-300">+</span>}
            </React.Fragment>
        ))}
    </span>
);
