'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, Send, FileText, Archive, Trash2, Tag } from 'lucide-react';

interface EmailFolderNavProps {
  unreadCount?: number;
  draftCount?: number;
}

export function EmailFolderNav({ unreadCount = 0, draftCount = 0 }: EmailFolderNavProps) {
  const pathname = usePathname();

  const folders = [
    { name: 'Inbox', path: '/inbox', icon: Inbox, count: unreadCount },
    { name: 'Sent', path: '/inbox?folder=sent', icon: Send },
    { name: 'Drafts', path: '/inbox?folder=drafts', icon: FileText, count: draftCount },
    { name: 'Archive', path: '/inbox?folder=archive', icon: Archive },
    { name: 'Trash', path: '/inbox?folder=trash', icon: Trash2 },
  ];

  return (
    <div className="w-64 bg-white/40 border-r border-black/5 p-4">
      <div className="space-y-1">
        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-3">
          Folders
        </p>
        {folders.map((folder) => {
          const Icon = folder.icon;
          const isActive = pathname === folder.path || pathname.includes(folder.path);
          
          return (
            <Link
              key={folder.path}
              href={folder.path}
              className={`flex items-center justify-between px-3 py-2 rounded text-sm font-sans hover:bg-black/5 ${
                isActive ? 'bg-black/5 font-semibold' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={16} />
                <span>{folder.name}</span>
              </div>
              {folder.count !== undefined && folder.count > 0 && (
                <span className="px-2 py-0.5 text-xs bg-[var(--forest-green)] text-[var(--ivory)] rounded-full">
                  {folder.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-3">
          Labels
        </p>
        <div className="space-y-1">
          <Link
            href="/inbox?label=important"
            className="flex items-center gap-3 px-3 py-2 rounded text-sm font-sans hover:bg-black/5"
          >
            <Tag size={16} />
            <span>Important</span>
          </Link>
          <Link
            href="/inbox?label=follow-up"
            className="flex items-center gap-3 px-3 py-2 rounded text-sm font-sans hover:bg-black/5"
          >
            <Tag size={16} />
            <span>Follow Up</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
