'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
    name: string;
    email: string;
    avatar?: string;
}

interface UserContextType {
    user: User;
    setUser: (user: User) => void;
}

// Default user - can be replaced with session/auth data
const DEFAULT_USER: User = {
    name: 'Founder',
    email: 'founder@founderos.local',
    avatar: '👨'
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User>(DEFAULT_USER);

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
