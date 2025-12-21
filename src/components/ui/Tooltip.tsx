'use client';

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, side = 'top' }) => {
    const [visible, setVisible] = useState(false);

    const positionClasses = {
        top: 'bottom-full mb-2',
        bottom: 'top-full mt-2',
        left: 'right-full mr-2',
        right: 'left-full ml-2'
    };

    return (
        <div className="relative inline-flex items-center group cursor-help">
            <div
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                className="inline-flex"
            >
                {children}
            </div>

            {visible && (
                <div
                    className={`absolute ${positionClasses[side]} left-1/2 -translate-x-1/2 z-50 px-3 py-2 bg-zinc-800 text-white text-[11px] font-sans rounded-sm whitespace-nowrap pointer-events-none animate-in fade-in duration-150`}
                >
                    {text}
                    <div className={`absolute w-1.5 h-1.5 bg-zinc-800 ${
                        side === 'top' ? '-bottom-0.75 rotate-45' :
                        side === 'bottom' ? '-top-0.75 rotate-45' :
                        side === 'left' ? '-right-0.75 rotate-45' :
                        '-left-0.75 rotate-45'
                    }`} />
                </div>
            )}
        </div>
    );
};
