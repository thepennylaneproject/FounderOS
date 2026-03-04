'use client';

import React from 'react';

/**
 * Action: Typographic treatment for interactive elements
 * 
 * NOT a "button component"—actions are subordinate to content.
 * Most actions should be Quiet; use Emphasized variant ≤2x per view.
 * 
 * Variants:
 * - quiet (default): Label-weight text, Ink color, hover underline
 * - emphasized: Micro uppercase, Ink background, Ivory text
 * - utility: Micro uppercase, gray text, low-priority
 */

interface ActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'quiet' | 'emphasized' | 'utility';
  children: React.ReactNode;
}

export const Action: React.FC<ActionProps> = ({ 
  variant = 'quiet', 
  className = '', 
  children, 
  ...props 
}) => {
  const baseClass = `action-${variant}`;
  const combinedClass = className ? `${baseClass} ${className}` : baseClass;

  return (
    <button className={combinedClass} {...props}>
      {children}
    </button>
  );
};
