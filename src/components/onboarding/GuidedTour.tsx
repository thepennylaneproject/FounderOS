'use client';

import { useEffect, useState } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import { usePathname } from 'next/navigation';

const TOUR_COMPLETED_KEY = 'founderos_tour_completed';

interface TourStep {
    id: string;
    title: string;
    text: string;
    attachTo: {
        element: string;
        on: 'top' | 'bottom' | 'left' | 'right';
    };
}

const tourSteps: TourStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to FounderOS! 🚀',
        text: 'Let\'s take a quick tour to help you get the most out of your new command center.',
        attachTo: { element: '[data-tour="dashboard-header"]', on: 'bottom' },
    },
    {
        id: 'navigation',
        title: 'Navigation',
        text: 'Use the sidebar to navigate between different sections: CRM, Campaigns, Domains, and more.',
        attachTo: { element: '[data-tour="sidebar"]', on: 'right' },
    },
    {
        id: 'crm',
        title: 'Customer Relationships',
        text: 'Manage all your contacts here. Add new leads, track engagement, and move them through your pipeline.',
        attachTo: { element: '[data-tour="crm-link"]', on: 'right' },
    },
    {
        id: 'campaigns',
        title: 'Email Campaigns',
        text: 'Create and send targeted outreach campaigns. Our AI can help you draft compelling messages.',
        attachTo: { element: '[data-tour="campaigns-link"]', on: 'right' },
    },
    {
        id: 'domains',
        title: 'Domain Infrastructure',
        text: 'Connect your email domains here for authenticated sending with better deliverability.',
        attachTo: { element: '[data-tour="domains-link"]', on: 'right' },
    },
    {
        id: 'ai-assistant',
        title: 'AI Assistant',
        text: 'Our AI can draft emails, suggest next actions, and help you work faster. Look for the ✨ icon.',
        attachTo: { element: '[data-tour="ai-button"]', on: 'left' },
    },
    {
        id: 'quick-launch',
        title: 'Quick Launch',
        text: 'Use Quick Launch to rapidly access common actions like adding contacts or starting campaigns.',
        attachTo: { element: '[data-tour="quick-launch"]', on: 'bottom' },
    },
    {
        id: 'complete',
        title: 'You\'re All Set! 🎉',
        text: 'That\'s the basics! Start by adding your first contact or connecting a domain. You can replay this tour anytime from Settings.',
        attachTo: { element: '[data-tour="dashboard-header"]', on: 'bottom' },
    },
];

export function GuidedTour() {
    const pathname = usePathname();
    const [tourCompleted, setTourCompleted] = useState(true); // Default to true to prevent flash

    useEffect(() => {
        // Check if tour was already completed
        const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
        setTourCompleted(completed === 'true');
    }, []);

    useEffect(() => {
        // Only show tour on dashboard and if not completed
        if (tourCompleted || pathname !== '/') return;

        // Wait for DOM to be ready
        const timeout = setTimeout(() => {
            const tour = new Shepherd.Tour({
                useModalOverlay: true,
                defaultStepOptions: {
                    classes: 'founderos-tour-step',
                    scrollTo: { behavior: 'smooth', block: 'center' },
                    cancelIcon: { enabled: true },
                },
            });

            // Add steps
            tourSteps.forEach((step, index) => {
                const isLast = index === tourSteps.length - 1;
                const isFirst = index === 0;

                tour.addStep({
                    id: step.id,
                    title: step.title,
                    text: step.text,
                    attachTo: step.attachTo,
                    buttons: [
                        ...(isFirst ? [] : [{
                            text: '← Back',
                            action: () => tour.back(),
                            secondary: true,
                        }]),
                        ...(isFirst ? [{
                            text: 'Skip Tour',
                            action: () => tour.complete(),
                            secondary: true,
                        }] : []),
                        {
                            text: isLast ? 'Get Started!' : 'Next →',
                            action: () => isLast ? tour.complete() : tour.next(),
                        },
                    ],
                });
            });

            // Mark tour as complete when finished
            tour.on('complete', () => {
                localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
                setTourCompleted(true);
            });

            tour.on('cancel', () => {
                localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
                setTourCompleted(true);
            });

            tour.start();
        }, 1000); // Give DOM time to render

        return () => clearTimeout(timeout);
    }, [tourCompleted, pathname]);

    return null; // This component doesn't render anything visible
}

// Utility function to reset tour (for settings page)
export function resetTour() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(TOUR_COMPLETED_KEY);
        window.location.reload();
    }
}
