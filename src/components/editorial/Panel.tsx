'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Panel: A page-like takeover (not a dialog popup)
 * 
 * Rule: Modals should feel like temporary pages, not interruptions.
 * 
 * Treatment:
 * - Full-height side panel (slide in from right)
 * - Same typographic hierarchy as a page
 * - No visible "X" button—clear "Done" action or click-outside-to-dismiss
 * -Backdrop: subtle ink with blur
 */

interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional primary action (e.g., "Done", "Save") */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const Panel: React.FC<PanelProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  action 
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/20 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Panel content - slides in from right */}
      <div 
        className="relative bg-ivory w-full max-w-2xl h-full overflow-hidden flex flex-col shadow-2xl"
        style={{
          animation: 'slideInFromRight 0.2s ease-out',
        }}
      >
        {/* Header - uses editorial typographic hierarchy */}
        <header className="border-b" style={{ borderColor: 'var(--border-content)', padding: 'var(--space-lg)' }}>
          <div className="flex items-start justify-between">
            <h2 className="type-headline">{title}</h2>
            <button
              onClick={onClose}
              className="action-utility p-sm"
              aria-label="Close panel"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Content - scrollable */}
        <div 
          className="flex-1 overflow-y-auto type-body"
          style={{ padding: 'var(--space-lg)' }}
        >
          {children}
        </div>

        {/* Footer with action (if provided) */}
        {action && (
          <footer 
            className="border-t" 
            style={{ 
              borderColor: 'var(--border-content)', 
              padding: 'var(--space-lg)' 
            }}
          >
            <button
              onClick={action.onClick}
              className="action-emphasized w-full"
            >
              {action.label}
            </button>
          </footer>
        )}
      </div>

      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};
