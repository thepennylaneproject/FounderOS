'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Users,
    Send,
    ShieldCheck,
    Workflow,
    Inbox,
    Zap,
    Plus,
    Settings,
    Command,
    ArrowRight,
} from 'lucide-react';

interface CommandItem {
    id: string;
    label: string;
    shortcut?: string;
    icon?: React.ReactNode;
    category: 'navigation' | 'actions' | 'search';
    action: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onAction?: (actionId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
    isOpen,
    onClose,
    onAction,
}) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const commands: CommandItem[] = useMemo(() => [
        // Navigation
        { id: 'nav-dashboard', label: 'Go to Dashboard', shortcut: 'G D', icon: <Zap size={16} />, category: 'navigation', action: () => router.push('/') },
        { id: 'nav-crm', label: 'Go to CRM', shortcut: 'G C', icon: <Users size={16} />, category: 'navigation', action: () => router.push('/crm') },
        { id: 'nav-campaigns', label: 'Go to Campaigns', shortcut: 'G P', icon: <Send size={16} />, category: 'navigation', action: () => router.push('/campaigns') },
        { id: 'nav-domains', label: 'Go to Domains', shortcut: 'G O', icon: <ShieldCheck size={16} />, category: 'navigation', action: () => router.push('/domains') },
        { id: 'nav-inbox', label: 'Go to Inbox', shortcut: 'G I', icon: <Inbox size={16} />, category: 'navigation', action: () => router.push('/inbox') },
        { id: 'nav-automations', label: 'Go to Automations', shortcut: 'G A', icon: <Workflow size={16} />, category: 'navigation', action: () => router.push('/automations') },
        
        // Actions
        { id: 'action-new-contact', label: 'Add New Contact', shortcut: 'N C', icon: <Plus size={16} />, category: 'actions', action: () => onAction?.('new-contact') },
        { id: 'action-new-campaign', label: 'Create Campaign', shortcut: 'N P', icon: <Plus size={16} />, category: 'actions', action: () => onAction?.('new-campaign') },
        { id: 'action-new-domain', label: 'Add Domain', shortcut: 'N D', icon: <Plus size={16} />, category: 'actions', action: () => onAction?.('new-domain') },
        { id: 'action-settings', label: 'Open Settings', shortcut: ',', icon: <Settings size={16} />, category: 'actions', action: () => onAction?.('settings') },
    ], [router, onAction]);

    const filteredCommands = useMemo(() => {
        if (!query) return commands;
        const lower = query.toLowerCase();
        return commands.filter(cmd =>
            cmd.label.toLowerCase().includes(lower) ||
            cmd.category.includes(lower)
        );
    }, [commands, query]);

    // Reset selection when filtered results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredCommands]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action();
                    onClose();
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    }, [filteredCommands, selectedIndex, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        
        const selected = list.children[selectedIndex] as HTMLElement;
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    const groupedCommands = {
        navigation: filteredCommands.filter(c => c.category === 'navigation'),
        actions: filteredCommands.filter(c => c.category === 'actions'),
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                onClick={onClose}
            />
            
            {/* Palette */}
            <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white rounded-lg shadow-2xl border border-black/10 z-50 overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-black/5">
                    <Search size={18} className="text-zinc-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command or search..."
                        className="flex-1 bg-transparent text-sm font-sans outline-none placeholder:text-zinc-400"
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 rounded text-[10px] font-sans font-bold text-zinc-500">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
                    {filteredCommands.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-zinc-400">
                            No commands found for "{query}"
                        </div>
                    ) : (
                        <>
                            {groupedCommands.navigation.length > 0 && (
                                <>
                                    <div className="px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
                                        Navigation
                                    </div>
                                    {groupedCommands.navigation.map((cmd, i) => (
                                        <CommandRow
                                            key={cmd.id}
                                            command={cmd}
                                            isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                                            onClick={() => {
                                                cmd.action();
                                                onClose();
                                            }}
                                        />
                                    ))}
                                </>
                            )}
                            {groupedCommands.actions.length > 0 && (
                                <>
                                    <div className="px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mt-2">
                                        Actions
                                    </div>
                                    {groupedCommands.actions.map((cmd, i) => (
                                        <CommandRow
                                            key={cmd.id}
                                            command={cmd}
                                            isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                                            onClick={() => {
                                                cmd.action();
                                                onClose();
                                            }}
                                        />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-black/5 bg-zinc-50/50 flex items-center justify-between text-[10px] text-zinc-400">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">↓</kbd>
                            to navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">↵</kbd>
                            to select
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Command size={12} />
                        <span>K to open</span>
                    </div>
                </div>
            </div>
        </>
    );
};

const CommandRow: React.FC<{
    command: CommandItem;
    isSelected: boolean;
    onClick: () => void;
}> = ({ command, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
            isSelected ? 'bg-zinc-100' : 'hover:bg-zinc-50'
        }`}
    >
        <span className="text-zinc-400">{command.icon}</span>
        <span className="flex-1 text-sm font-sans">{command.label}</span>
        {command.shortcut && (
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                {command.shortcut}
            </span>
        )}
        <ArrowRight size={14} className={`text-zinc-300 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
    </button>
);

// Hook to manage command palette state
export function useCommandPalette() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K to open
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(prev => !prev),
    };
}
