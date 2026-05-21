import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAllSubCompanies, getAllV3StoresIncludingInactive, upsertSubCompany, type SubCompany } from '@/lib/firebase-stores';

// GET: List all sub-companies (auth required, returns flat array). Each entry is
// augmented with `store_count` — the number of stores assigned to that area
// (by sub_company_id) — so the area selector can display it.
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const [subCompanies, stores] = await Promise.all([
      getAllSubCompanies(),
      getAllV3StoresIncludingInactive(),
    ]);
    const counts = new Map<string, number>();
    for (const s of stores) {
      if (s.sub_company_id) counts.set(s.sub_company_id, (counts.get(s.sub_company_id) ?? 0) + 1);
    }
    const withCounts = subCompanies.map(sc => ({ ...sc, store_count: counts.get(sc.id) ?? 0 }));
    return NextResponse.json(withCounts);
  } catch (err) {
    console.error('Failed to fetch sub-companies:', err);
    return NextResponse.json([], { status: 500 });
  }
}

// POST: Create or update a sub-company (super_admin only)
export async function POST(req: NextRequest) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, name, slug, stores, logo_url, description } = body as SubCompany;

    if (!id || !name || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, slug' },
        { status: 400 },
      );
    }

    const subCompany: SubCompany = {
      id,
      name,
      slug,
      stores: stores || [],
      logo_url: logo_url || '',
      description: description || '',
    };

    await upsertSubCompany(subCompany);
    return NextResponse.json({ success: true, sub_company: subCompany });
  } catch (err) {
    console.error('Failed to upsert sub-company:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
