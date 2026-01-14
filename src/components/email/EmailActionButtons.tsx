'use client';

import React from 'react';
import { Reply, ReplyAll, Forward, Trash2, Archive, Star, MoreHorizontal } from 'lucide-react';

interface EmailActionButtonsProps {
  messageId: string;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onToggleStar: () => void;
  isStarred?: boolean;
}

export function EmailActionButtons({
  messageId,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onArchive,
  onToggleStar,
  isStarred = false,
}: EmailActionButtonsProps) {
  return (
    <div className="flex items-center gap-2 p-3 border-b border-black/5 bg-white">
      <button
        onClick={onReply}
        className="flex items-center gap-2 px-3 py-2 text-xs font-sans uppercase tracking-widest border border-black/10 hover:bg-black/5"
        title="Reply"
      >
        <Reply size={14} />
        Reply
      </button>
      
      <button
        onClick={onReplyAll}
        className="flex items-center gap-2 px-3 py-2 text-xs font-sans uppercase tracking-widest border border-black/10 hover:bg-black/5"
        title="Reply All"
      >
        <ReplyAll size={14} />
        Reply All
      </button>
      
      <button
        onClick={onForward}
        className="flex items-center gap-2 px-3 py-2 text-xs font-sans uppercase tracking-widest border border-black/10 hover:bg-black/5"
        title="Forward"
      >
        <Forward size={14} />
        Forward
      </button>
      
      <div className="flex-1" />
      
      <button
        onClick={onArchive}
        className="p-2 border border-black/10 hover:bg-black/5"
        title="Archive"
      >
        <Archive size={16} />
      </button>
      
      <button
        onClick={onToggleStar}
        className={`p-2 border border-black/10 hover:bg-black/5 ${isStarred ? 'text-yellow-500' : ''}`}
        title={isStarred ? 'Unstar' : 'Star'}
      >
        <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
      </button>
      
      <button
        onClick={onDelete}
        className="p-2 border border-black/10 hover:bg-red-50 hover:text-red-600"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
      
      <button
        className="p-2 border border-black/10 hover:bg-black/5"
        title="More Actions"
      >
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}
