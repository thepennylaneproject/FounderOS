'use client';

import React from 'react';
import { useState, useCallback } from 'react';

interface UseStreamingAIOptions {
    endpoint: string;
    onComplete?: (fullText: string) => void;
    onError?: (error: Error) => void;
}

interface UseStreamingAIReturn {
    /** The streamed text content so far */
    streamedText: string;
    /** Whether the stream is currently active */
    isStreaming: boolean;
    /** Any error that occurred */
    error: Error | null;
    /** Start streaming with the given prompt/payload */
    startStream: (payload: Record<string, any>) => Promise<void>;
    /** Abort the current stream */
    abortStream: () => void;
    /** Reset the state */
    reset: () => void;
}

/**
 * Hook for streaming AI responses with real-time text updates.
 * Uses SSE (Server-Sent Events) or chunked responses for progressive display.
 * 
 * @example
 * const { streamedText, isStreaming, startStream } = useStreamingAI({
 *   endpoint: '/api/ai/draft',
 *   onComplete: (text) => setDraftContent(text)
 * });
 */
export function useStreamingAI({
    endpoint,
    onComplete,
    onError,
}: UseStreamingAIOptions): UseStreamingAIReturn {
    const [streamedText, setStreamedText] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    const startStream = useCallback(async (payload: Record<string, any>) => {
        // Reset state
        setStreamedText('');
        setError(null);
        setIsStreaming(true);

        const controller = new AbortController();
        setAbortController(controller);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                },
                body: JSON.stringify({ ...payload, stream: true }),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`AI service error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                
                // Parse SSE format (data: {...})
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.content) {
                            fullText += data.content;
                            setStreamedText(fullText);
                        }
                        if (data.done) {
                            break;
                        }
                    } catch {
                        // If not JSON, treat as plain text
                        fullText += line.slice(6);
                        setStreamedText(fullText);
                    }
                }
            }

            onComplete?.(fullText);
        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                // Stream was cancelled intentionally
                return;
            }
            const error = err instanceof Error ? err : new Error('Streaming failed');
            setError(error);
            onError?.(error);
        } finally {
            setIsStreaming(false);
            setAbortController(null);
        }
    }, [endpoint, onComplete, onError]);

    const abortStream = useCallback(() => {
        abortController?.abort();
        setIsStreaming(false);
    }, [abortController]);

    const reset = useCallback(() => {
        abortStream();
        setStreamedText('');
        setError(null);
    }, [abortStream]);

    return {
        streamedText,
        isStreaming,
        error,
        startStream,
        abortStream,
        reset,
    };
}

// Typing indicator component for AI responses
export const TypingIndicator: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`flex items-center gap-1 ${className}`}>
        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
);
