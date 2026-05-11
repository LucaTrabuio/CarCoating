import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth';
import { AdminAuthProvider } from '@/components/admin/AdminAuthProvider';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  if (!session) {
    redirect('/login');
  }

  return (
    <AdminAuthProvider user={session}>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
