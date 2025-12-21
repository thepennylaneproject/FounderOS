'use client';

import React from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useUI } from '@/context/UIContext';

export const Toaster: React.FC = () => {
    const { toasts, removeToast } = useUI();

    return (
        <div className="fixed bottom-8 right-8 z-[60] flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
                        pointer-events-auto flex items-center gap-4 px-6 py-4 rounded-sm border shadow-lg 
                        bg-white min-w-[320px] max-w-md animate-in slide-in-from-right-8 duration-300
                        ${toast.type === 'success' ? 'border-green-100' :
                            toast.type === 'error' ? 'border-red-100' : 'border-black/5'}
                    `}
                >
                    <div className="flex-shrink-0">
                        {toast.type === 'success' && <CheckCircle2 size={18} className="text-green-500" />}
                        {toast.type === 'error' && <AlertCircle size={18} className="text-red-500" />}
                        {toast.type === 'info' && <Info size={18} className="text-zinc-400" />}
                    </div>

                    <p className="flex-1 text-sm font-sans font-medium text-zinc-700 leading-tight">
                        {toast.message}
                    </p>

                    <button
                        onClick={() => removeToast(toast.id)}
                        className="p-1 text-zinc-300 hover:text-zinc-500 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};
