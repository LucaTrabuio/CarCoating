import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import {
  getGlobalDefaults,
  saveGlobalDefaults,
  DEFAULTABLE_KEYS,
  type DefaultableKey,
  type PolicyEntry,
} from '@/lib/global-defaults';
import { FONT_PRESETS } from '@/lib/types';

// GET: any authenticated user — values are public (they render on storefronts);
// store admins need to know policy + current defaults to render their builder.
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const defaults = await getGlobalDefaults();
    return NextResponse.json(defaults);
  } catch (error) {
    console.error('GET /api/admin/defaults error:', error);
    return NextResponse.json({ error: 'Failed to load defaults' }, { status: 500 });
  }
}

// PUT: super_admin only — accepts partial { values?, policy? }.
export async function PUT(request: Request) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as {
      values?: Partial<Record<string, string>>;
      policy?: Partial<Record<string, PolicyEntry>>;
      siteFont?: string | null;
    };

    // Whitelist keys to prevent arbitrary writes.
    const allowed = new Set<string>(DEFAULTABLE_KEYS as readonly string[]);
    const allowedFontIds = new Set(FONT_PRESETS.map(f => f.id as string));
    const values: Partial<Record<DefaultableKey, string>> = {};
    const policy: Partial<Record<DefaultableKey, PolicyEntry>> = {};

    if (body.values) {
      for (const [k, v] of Object.entries(body.values)) {
        if (!allowed.has(k)) continue;
        if (typeof v !== 'string') continue;
        values[k as DefaultableKey] = v;
      }
    }
    if (body.policy) {
      for (const [k, v] of Object.entries(body.policy)) {
        if (!allowed.has(k)) continue;
        if (!v || typeof v.allowOverride !== 'boolean') continue;
        policy[k as DefaultableKey] = { allowOverride: v.allowOverride };
      }
    }

    let siteFont: string | null | undefined;
    if (body.siteFont === null || body.siteFont === '') {
      siteFont = null;
    } else if (typeof body.siteFont === 'string' && allowedFontIds.has(body.siteFont)) {
      siteFont = body.siteFont;
    }

    await saveGlobalDefaults({ values, policy, siteFont }, auth.user.uid);
    auditLog('global_defaults_update', auth.user.uid, {
      keysChanged: [...Object.keys(values), ...Object.keys(policy)],
      siteFont: siteFont === undefined ? undefined : siteFont,
    });
    // Bust the root layout cache so the new --site-font CSS variable
    // (and any other site-wide default) reaches every page on next load.
    if (siteFont !== undefined) {
      try { revalidatePath('/', 'layout'); } catch (e) { console.error('revalidatePath after font save failed:', e); }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/defaults error:', error);
    return NextResponse.json({ error: 'Failed to save defaults' }, { status: 500 });
  }
}
