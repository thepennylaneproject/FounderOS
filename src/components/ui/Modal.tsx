'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useUI } from '@/context/UIContext';

export const GlobalModal: React.FC = () => {
    const { modal, closeModal } = useUI();

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeModal();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [closeModal]);

    if (!modal.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[var(--ink)]/40 backdrop-blur-sm"
                onClick={closeModal}
            />

            {/* Modal Content */}
            <div className="relative bg-[var(--ivory)] border border-black/5 shadow-2xl rounded-sm w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <header className="px-8 pt-8 flex justify-between items-start">
                    <h2 className="text-2xl font-serif italic tracking-tight">{modal.title}</h2>
                    <button
                        onClick={closeModal}
                        className="p-1 text-zinc-400 hover:text-[var(--ink)] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="p-8">
                    {modal.content}
                </div>
            </div>
        </div>
    );
};
