'use client';

import React from 'react';

/**
 * LoadingState: Typographically matched placeholder (not generic gray skeleton)
 * 
 * Rule: Match exact line-height and width of the text they replace.
 * Use Ivory tone instead of gray; pulse subtly or remain static.
 * 
 * Loading states should look intentional, not like placeholders.
 */

interface LoadingStateProps {
  lines?: number;
  width?: 'full' | 'half' | 'quarter';
  animate?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  lines = 3, 
  width = 'full',
  animate = true 
}) => {
  const widthClasses = {
    full: 'w-full',
    half: 'w-1/2',
    quarter: 'w-1/4',
  };

  const animateClass = animate ? 'animate-pulse' : '';

  return (
    <div className="space-y-md">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-[var(--type-body-line)] bg-[var(--ivory)] border-t border-black/5 ${widthClasses[width]} ${animateClass}`}
          style={{
            height: 'calc(var(--type-body-size) * var(--type-body-line))',
          }}
        />
      ))}
    </div>
  );
};

/**
 * LoadingStateList: For list-based loading states
 * Shows the ruled border structure even while loading
 */
export const LoadingStateList: React.FC<{ items?: number }> = ({ items = 5 }) => {
  return (
    <div className="divide-y divide-black/5">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="p-md space-y-sm animate-pulse">
          <div 
            className="bg-[var(--ivory)] border-t border-black/5"
            style={{ height: 'calc(var(--type-label-size) * var(--type-label-line))', width: '60%' }}
          />
          <div 
            className="bg-[var(--ivory)] border-t border-black/5"
            style={{ height: 'calc(var(--type-body-size) * var(--type-body-line))', width: '40%' }}
          />
        </div>
      ))}
    </div>
  );
};
