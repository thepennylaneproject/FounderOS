import { DashboardShell } from '@/components/DashboardShell';
import { Providers } from '@/components/Providers';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardShell>
            {children}
        </DashboardShell>
    );
}
