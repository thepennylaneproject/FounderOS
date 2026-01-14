'use client';

import { useState, useCallback } from 'react';

export function useEmailComposer() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'new' | 'reply' | 'forward'>('new');
  const [replyToId, setReplyToId] = useState<string | undefined>();
  const [draftId, setDraftId] = useState<string | undefined>();

  const openComposer = useCallback((options: {
    mode?: 'new' | 'reply' | 'forward';
    replyToId?: string;
    draftId?: string;
  } = {}) => {
    setMode(options.mode || 'new');
    setReplyToId(options.replyToId);
    setDraftId(options.draftId);
    setIsOpen(true);
  }, []);

  const closeComposer = useCallback(() => {
    setIsOpen(false);
    setMode('new');
    setReplyToId(undefined);
    setDraftId(undefined);
  }, []);

  return {
    isOpen,
    mode,
    replyToId,
    draftId,
    openComposer,
    closeComposer,
  };
}

export function useEmailActions() {
  const moveToFolder = async (messageId: string, folder: string) => {
    // Implementation would update the message folder via API
    await fetch(`/api/emails/${messageId}/folder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    });
  };

  const toggleStar = async (messageId: string, isStarred: boolean) => {
    await fetch(`/api/emails/${messageId}/star`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_starred: !isStarred }),
    });
  };

  const toggleRead = async (messageId: string, isRead: boolean) => {
    await fetch(`/api/emails/${messageId}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: !isRead }),
    });
  };

  const deleteEmail = async (messageId: string) => {
    await moveToFolder(messageId, 'trash');
  };

  const archiveEmail = async (messageId: string) => {
    await moveToFolder(messageId, 'archive');
  };

  return {
    moveToFolder,
    toggleStar,
    toggleRead,
    deleteEmail,
    archiveEmail,
  };
}
