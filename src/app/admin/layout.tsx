import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { AdminAuthProvider } from '@/components/admin/AdminAuthProvider';
import { AdminShell } from '@/components/admin/AdminShell';
import './admin-theme.css';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  // Proxy sets this header on public admin paths (reset-password, forgot-password)
  const isPublicPage = headersList.get('x-admin-public-page') === '1';

  const session = await verifySession();

  if (!session && !isPublicPage) {
    redirect('/login');
  }

  // Public pages (reset-password, forgot-password) render without the admin shell
  if (!session) {
    return <>{children}</>;
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
