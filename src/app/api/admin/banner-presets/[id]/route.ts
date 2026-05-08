import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import { bannerPresetWriteSchema } from '@/lib/validations';
import { canSeePreset, canWritePreset, deletePreset, getPreset, updatePreset } from '@/lib/banner-presets';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const preset = await getPreset(id);
    if (!preset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canSeePreset(auth.user, preset)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ preset });
  } catch (error) {
    console.error(`GET /api/admin/banner-presets/${id} error:`, error);
    return NextResponse.json({ error: 'Failed to load preset' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const preset = await getPreset(id);
    if (!preset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canWritePreset(auth.user, preset)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bannerPresetWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues.map(i => i.message) },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Prevent privilege escalation: a store_admin cannot flip their preset to global.
    if (!canWritePreset(auth.user, { scope: data.scope, owner_store_id: data.owner_store_id })) {
      return NextResponse.json({ error: 'Forbidden: cannot change to this scope' }, { status: 403 });
    }

    await updatePreset(
      id,
      {
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
      },
      auth.user.uid,
    );
    auditLog('banner_preset_update', auth.user.uid, { id, scope: data.scope });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`PUT /api/admin/banner-presets/${id} error:`, error);
    return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const preset = await getPreset(id);
    if (!preset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canWritePreset(auth.user, preset)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await deletePreset(id);
    auditLog('banner_preset_delete', auth.user.uid, { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/admin/banner-presets/${id} error:`, error);
    return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
  }
}
