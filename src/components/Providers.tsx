'use client';

import React from 'react';
import { UIProvider } from '@/context/UIContext';
import { UserProvider } from '@/context/UserContext';
import { Toaster } from '@/components/ui/Toaster';
import { GlobalModal } from '@/components/ui/Modal';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <UserProvider>
            <UIProvider>
                {children}
                <Toaster />
                <GlobalModal />
            </UIProvider>
        </UserProvider>
    );
};
