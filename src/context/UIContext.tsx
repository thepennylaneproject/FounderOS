'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface UIContextType {
    // Modal State
    modal: {
        isOpen: boolean;
        title: string;
        content: ReactNode;
        onClose: () => void;
    };
    openModal: (title: string, content: ReactNode) => void;
    closeModal: () => void;

    // Toast State
    toasts: Toast[];
    showToast: (message: string, type?: ToastType) => void;
    removeToast: (id: string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: ReactNode }>({
        isOpen: false,
        title: '',
        content: null,
    });

    const [toasts, setToasts] = useState<Toast[]>([]);

    const openModal = (title: string, content: ReactNode) => {
        setModal({ isOpen: true, title, content });
    };

    const closeModal = () => {
        setModal({ ...modal, isOpen: false });
    };

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto-remove toast after 4 seconds
        setTimeout(() => {
            removeToast(id);
        }, 4000);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <UIContext.Provider value={{
            modal: { ...modal, onClose: closeModal },
            openModal,
            closeModal,
            toasts,
            showToast,
            removeToast
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
