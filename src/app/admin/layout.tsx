import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth';
import { AdminAuthProvider } from '@/components/admin/AdminAuthProvider';
import { AdminShell } from '@/components/admin/AdminShell';
import './admin-theme.css';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  if (!session) {
    redirect('/login');
  }

  // data-admin scopes admin-theme.css tokens so they don't leak into
  // anything rendered outside the admin tree.
  return (
    <div data-admin="true">
      <AdminAuthProvider user={session}>
        <AdminShell>{children}</AdminShell>
      </AdminAuthProvider>
    </div>
  );
}
