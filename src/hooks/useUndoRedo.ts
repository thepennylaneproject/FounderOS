'use client';

import { useState, useCallback, useRef } from 'react';

interface UseUndoRedoOptions<T> {
    /** Maximum number of states to keep in history */
    maxHistory?: number;
    /** Callback when undo is performed */
    onUndo?: (previousState: T, currentState: T) => void;
    /** Callback when redo is performed */
    onRedo?: (nextState: T, currentState: T) => void;
}

interface UseUndoRedoReturn<T> {
    /** Current state */
    state: T;
    /** Set new state (adds to history) */
    setState: (newState: T | ((prev: T) => T)) => void;
    /** Undo to previous state */
    undo: () => void;
    /** Redo to next state */
    redo: () => void;
    /** Whether undo is available */
    canUndo: boolean;
    /** Whether redo is available */
    canRedo: boolean;
    /** Clear all history */
    clearHistory: () => void;
    /** Number of undo steps available */
    undoCount: number;
    /** Number of redo steps available */
    redoCount: number;
}

/**
 * Hook for undo/redo functionality with history management.
 * 
 * @example
 * const { state, setState, undo, redo, canUndo, canRedo } = useUndoRedo({
 *   contacts: []
 * });
 */
export function useUndoRedo<T>(
    initialState: T,
    options: UseUndoRedoOptions<T> = {}
): UseUndoRedoReturn<T> {
    const { maxHistory = 50, onUndo, onRedo } = options;

    const [state, setStateInternal] = useState<T>(initialState);
    const historyRef = useRef<T[]>([initialState]);
    const indexRef = useRef(0);

    const setState = useCallback((newState: T | ((prev: T) => T)) => {
        const resolved = typeof newState === 'function'
            ? (newState as (prev: T) => T)(historyRef.current[indexRef.current])
            : newState;

        // Clear any redo history
        historyRef.current = historyRef.current.slice(0, indexRef.current + 1);

        // Add new state
        historyRef.current.push(resolved);

        // Trim history if it exceeds max
        if (historyRef.current.length > maxHistory) {
            historyRef.current = historyRef.current.slice(-maxHistory);
        }

        indexRef.current = historyRef.current.length - 1;
        setStateInternal(resolved);
    }, [maxHistory]);

    const undo = useCallback(() => {
        if (indexRef.current > 0) {
            const currentState = historyRef.current[indexRef.current];
            indexRef.current -= 1;
            const previousState = historyRef.current[indexRef.current];
            setStateInternal(previousState);
            onUndo?.(previousState, currentState);
        }
    }, [onUndo]);

    const redo = useCallback(() => {
        if (indexRef.current < historyRef.current.length - 1) {
            const currentState = historyRef.current[indexRef.current];
            indexRef.current += 1;
            const nextState = historyRef.current[indexRef.current];
            setStateInternal(nextState);
            onRedo?.(nextState, currentState);
        }
    }, [onRedo]);

    const clearHistory = useCallback(() => {
        historyRef.current = [state];
        indexRef.current = 0;
    }, [state]);

    return {
        state,
        setState,
        undo,
        redo,
        canUndo: indexRef.current > 0,
        canRedo: indexRef.current < historyRef.current.length - 1,
        clearHistory,
        undoCount: indexRef.current,
        redoCount: historyRef.current.length - 1 - indexRef.current,
    };
}

// Keyboard shortcut handler for undo/redo
export function useUndoRedoKeyboard(
    undo: () => void,
    redo: () => void,
    canUndo: boolean,
    canRedo: boolean
) {
    if (typeof window === 'undefined') return;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifier = isMac ? e.metaKey : e.ctrlKey;

        if (modifier && e.key === 'z' && !e.shiftKey && canUndo) {
            e.preventDefault();
            undo();
        } else if (modifier && e.key === 'z' && e.shiftKey && canRedo) {
            e.preventDefault();
            redo();
        } else if (modifier && e.key === 'y' && canRedo) {
            e.preventDefault();
            redo();
        }
    }, [undo, redo, canUndo, canRedo]);

    // Note: This should be attached in a useEffect in the consuming component
    return handleKeyDown;
}
