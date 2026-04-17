import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listRecentImports } from '@/lib/import-backups';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '10', 10) || 10, 1), 50);
  const imports = await listRecentImports(limit);

  // Store admins only see imports they triggered; super admins see all.
  const visible = auth.user.role === 'super_admin'
    ? imports
    : imports.filter((i) => i.createdBy === auth.user.email || i.createdBy === auth.user.uid);

  return NextResponse.json({ imports: visible });
}
