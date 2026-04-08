import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth';
import { AdminAuthProvider } from '@/components/admin/AdminAuthProvider';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  if (!session) {
    redirect('/login');
  }

  return (
    <AdminAuthProvider user={session}>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 bg-gray-50 p-6">{children}</main>
      </div>
    </AdminAuthProvider>
  );
}
