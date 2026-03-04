'use client';

import React from 'react';

/**
 * Frame: Semantic boundary marker (not a decorative card)
 * 
 * Rule: Only use when there's a discrete object (a thread, a contact, a campaign).
 * If removing the border wouldn't confuse what belongs together, use whitespace instead.
 * 
 * Visual treatment: Ruled top border + generous padding. No shadow, no background fill
 * unless it's a stateful container (e.g., selected item).
 */

interface FrameProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  selected?: boolean;
}

export const Frame: React.FC<FrameProps> = ({ 
  children, 
  selected = false,
  className = '', 
  ...props 
}) => {
  const baseClass = 'editorial-frame';
  const selectedClass = selected ? 'bg-black/[0.02]' : '';
  const combinedClass = [baseClass, selectedClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={combinedClass} {...props}>
      {children}
    </div>
  );
};
