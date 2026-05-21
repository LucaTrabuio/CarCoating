import { describe, it, expect } from 'vitest';
import { NAV_ITEMS, GROUP_ORDER, GROUP_LABEL } from '../components/admin/AdminSidebar';

const SUPER_ONLY_HREFS = new Set([
  '/admin/cases',
  '/admin/blog',
  '/admin/blog/import',
  '/admin/homepage',
  '/admin/area-hub',
  '/admin/campaigns',
  '/admin/stores',
  '/admin/keeper-surveys',
  '/admin/defaults',
  '/admin/master',
  '/admin/diagnostics',
  '/admin/system-alerts',
]);

describe('NAV_ITEMS — superAdminOnly set', () => {
  it('superAdminOnly hrefs match the expected set exactly', () => {
    const actual = new Set(
      NAV_ITEMS.filter(i => i.superAdminOnly).map(i => i.href),
    );
    expect(actual).toEqual(SUPER_ONLY_HREFS);
  });
});

describe('NAV_ITEMS — store_admin visibility', () => {
  const storeAdminVisible = NAV_ITEMS.filter(item =>
    !item.superAdminOnly && item.storeAdminVisible,
  );
  const storeAdminHrefs = new Set(storeAdminVisible.map(i => i.href));

  it('store_admin does not see /admin/homepage', () => {
    expect(storeAdminHrefs.has('/admin/homepage')).toBe(false);
  });

  it('store_admin does not see /admin/area-hub', () => {
    expect(storeAdminHrefs.has('/admin/area-hub')).toBe(false);
  });

  it('store_admin does not see any super-only href', () => {
    for (const href of SUPER_ONLY_HREFS) {
      expect(storeAdminHrefs.has(href), `store_admin should not see ${href}`).toBe(false);
    }
  });
});

describe('NAV_ITEMS — specific item properties', () => {
  it('/admin/builder has label 店舗ページ and storeAdminVisible true', () => {
    const item = NAV_ITEMS.find(i => i.href === '/admin/builder');
    expect(item).toBeDefined();
    expect(item!.label).toBe('店舗ページ');
    expect(item!.storeAdminVisible).toBe(true);
  });

  it('/admin/area-hub has superAdminOnly true and group pages', () => {
    const item = NAV_ITEMS.find(i => i.href === '/admin/area-hub');
    expect(item).toBeDefined();
    expect(item!.superAdminOnly).toBe(true);
    expect(item!.group).toBe('pages');
  });

  it('/admin/customers has group daily and storeAdminVisible true', () => {
    const item = NAV_ITEMS.find(i => i.href === '/admin/customers');
    expect(item).toBeDefined();
    expect(item!.group).toBe('daily');
    expect(item!.storeAdminVisible).toBe(true);
  });
});

describe('GROUP_ORDER and GROUP_LABEL', () => {
  it('every item.group is in GROUP_ORDER', () => {
    for (const item of NAV_ITEMS) {
      expect(GROUP_ORDER).toContain(item.group);
    }
  });

  it('GROUP_LABEL.pages is ページ編集', () => {
    expect(GROUP_LABEL.pages).toBe('ページ編集');
  });

  it('GROUP_LABEL.system is 分析・システム', () => {
    expect(GROUP_LABEL.system).toBe('分析・システム');
  });
});
