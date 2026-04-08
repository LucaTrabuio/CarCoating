import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAllSubCompanies, upsertSubCompany, type SubCompany } from '@/lib/firebase-stores';

// GET: List all sub-companies (auth required, returns flat array)
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const subCompanies = await getAllSubCompanies();
    return NextResponse.json(subCompanies);
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
