'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface MobileNavContextValue {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function useMobileNav() {
    const context = useContext(MobileNavContext);
    if (!context) {
        throw new Error('useMobileNav must be used within MobileNavProvider');
    }
    return context;
}

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    // Close on route change
    useEffect(() => {
        const handleRouteChange = () => setIsOpen(false);
        window.addEventListener('popstate', handleRouteChange);
        return () => window.removeEventListener('popstate', handleRouteChange);
    }, []);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <MobileNavContext.Provider value={{ isOpen, open, close, toggle }}>
            {children}
        </MobileNavContext.Provider>
    );
}

// Mobile navigation toggle button
export const MobileMenuButton: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { toggle, isOpen } = useMobileNav();

    return (
        <button
            onClick={toggle}
            className={`lg:hidden p-2 -m-2 ${className}`}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
        >
            <div className="w-6 h-5 relative flex flex-col justify-between">
                <span
                    className={`block h-0.5 w-6 bg-current transform transition-transform duration-200 ${
                        isOpen ? 'rotate-45 translate-y-2' : ''
                    }`}
                />
                <span
                    className={`block h-0.5 w-6 bg-current transition-opacity duration-200 ${
                        isOpen ? 'opacity-0' : ''
                    }`}
                />
                <span
                    className={`block h-0.5 w-6 bg-current transform transition-transform duration-200 ${
                        isOpen ? '-rotate-45 -translate-y-2' : ''
                    }`}
                />
            </div>
        </button>
    );
};

// Mobile sidebar overlay
export const MobileSidebar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isOpen, close } = useMobileNav();

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={close}
                aria-hidden="true"
            />

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-out lg:hidden ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
            >
                {children}
            </div>
        </>
    );
};
