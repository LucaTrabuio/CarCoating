import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth';
import { DiagnosticsClient } from './DiagnosticsClient';

export default async function DiagnosticsPage() {
  const session = await verifySession();
  if (!session) redirect('/login');
  if (session.role !== 'super_admin') redirect('/admin');

  return <DiagnosticsClient />;
}
