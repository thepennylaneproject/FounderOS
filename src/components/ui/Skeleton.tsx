'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animation = 'pulse',
}) => {
    const baseClasses = 'bg-zinc-200';
    
    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-sm',
    };

    const animationClasses = {
        pulse: 'animate-pulse',
        wave: 'skeleton-wave',
        none: '',
    };

    const style: React.CSSProperties = {
        width: width,
        height: height,
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
            style={style}
        />
    );
};

// Pre-built skeleton patterns for common UI elements
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`p-6 border border-black/5 bg-white rounded-sm space-y-4 ${className}`}>
        <div className="flex items-center gap-3">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
                <Skeleton height={14} width="60%" />
                <Skeleton height={10} width="40%" />
            </div>
        </div>
        <Skeleton height={12} width="100%" />
        <Skeleton height={12} width="80%" />
    </div>
);

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
    <tr className="border-b border-black/5">
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="p-4">
                <Skeleton height={14} width={i === 0 ? '80%' : '60%'} />
            </td>
        ))}
    </tr>
);

export const StatCardSkeleton: React.FC = () => (
    <div className="p-6 border border-black/5 bg-white rounded-sm">
        <Skeleton height={10} width="40%" className="mb-4" />
        <Skeleton height={32} width="60%" className="mb-2" />
        <Skeleton height={12} width="80%" />
    </div>
);

export const ContactCardSkeleton: React.FC = () => (
    <div className="p-4 border border-black/5 bg-white rounded-sm flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
            <Skeleton height={16} width="50%" />
            <Skeleton height={12} width="70%" />
        </div>
        <Skeleton height={28} width={80} />
    </div>
);

export const DomainCardSkeleton: React.FC = () => (
    <div className="p-6 border border-black/5 bg-white rounded-sm space-y-4">
        <div className="flex items-center justify-between">
            <Skeleton height={18} width="40%" />
            <Skeleton height={24} width={60} />
        </div>
        <div className="flex gap-8">
            <div className="space-y-2">
                <Skeleton height={10} width={80} />
                <Skeleton height={20} width={60} />
            </div>
            <div className="space-y-2">
                <Skeleton height={10} width={80} />
                <Skeleton height={20} width={60} />
            </div>
        </div>
    </div>
);

// Loading wrapper with progress indicator
export const LoadingOverlay: React.FC<{
    message?: string;
    progress?: number;
    children?: React.ReactNode;
}> = ({ message = 'Loading...', progress, children }) => (
    <div className="relative">
        {children}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-[var(--forest-green)] rounded-full animate-spin mb-3" />
            <p className="text-xs font-sans text-zinc-500 uppercase tracking-widest">{message}</p>
            {progress !== undefined && (
                <div className="w-32 h-1 bg-zinc-200 rounded-full mt-3 overflow-hidden">
                    <div
                        className="h-full bg-[var(--forest-green)] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    </div>
);
