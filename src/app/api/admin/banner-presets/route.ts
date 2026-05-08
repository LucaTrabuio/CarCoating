import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import { bannerPresetWriteSchema } from '@/lib/validations';
import { createPreset, listVisiblePresets, canWritePreset } from '@/lib/banner-presets';

// GET: list presets visible to the current user.
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const presets = await listVisiblePresets(auth.user);
    return NextResponse.json({ presets });
  } catch (error) {
    console.error('GET /api/admin/banner-presets error:', error);
    return NextResponse.json({ error: 'Failed to list presets' }, { status: 500 });
  }
}

// POST: create a new preset.
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = bannerPresetWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues.map(i => i.message) },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Scope enforcement: store_admin can only create scope=store for their own store.
    if (!canWritePreset(auth.user, { scope: data.scope, owner_store_id: data.owner_store_id })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (data.scope === 'store' && !data.owner_store_id) {
      return NextResponse.json({ error: 'owner_store_id required for store-scoped preset' }, { status: 400 });
    }

    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `bp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await createPreset({
      id,
      name: data.name,
      scope: data.scope,
      owner_store_id: data.scope === 'store' ? data.owner_store_id : '',
      mode: data.mode,
      preview_image_url: data.preview_image_url,
      structured: data.structured,
      html_content: data.html_content,
      combined_content: data.combined_content,
      is_template: data.is_template,
      fields: data.fields,
      created_by: auth.user.uid,
    });
    auditLog('banner_preset_create', auth.user.uid, { id, name: data.name, scope: data.scope });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('POST /api/admin/banner-presets error:', error);
    return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 });
  }
}
