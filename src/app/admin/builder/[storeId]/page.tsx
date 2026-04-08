'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  parsePageLayout,
  serializePageLayout,
  createBlock,
  BLOCK_META,
  type PageBlock,
  type BlockType,
  type PricingConfig,
  type StoreNewsItem,
} from '@/lib/block-types';
import type { V3StoreData } from '@/lib/v3-types';
import { coatingTiers } from '@/data/coating-tiers';
import SortableBlockItem from '../components/SortableBlockItem';
import BlockEditorSwitch from '../components/editors/BlockEditorSwitch';

// ─── Types ───

type TabId = 'blocks' | 'settings' | 'pricing' | 'options' | 'news';

interface ServiceOption {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

// ─── Inline helper: settings field ───

function SettingsField({ label, value, onChange, type = 'text', rows }: {
  label: string;
  value?: string | number | boolean;
  onChange: (val: string) => void;
  type?: 'text' | 'number' | 'checkbox' | 'textarea' | 'color';
  rows?: number;
}) {
  if (type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm col-span-2">
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(String(e.target.checked))}
          className="rounded border-gray-300"
        />
        {label}
      </label>
    );
  }
  if (type === 'textarea') {
    return (
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <textarea
          value={String(value || '')}
          onChange={e => onChange(e.target.value)}
          rows={rows || 3}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
        />
      </div>
    );
  }
  if (type === 'color') {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={String(value || '')}
            onChange={e => onChange(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
          />
          <input
            type="color"
            value={String(value || '#000000')}
            onChange={e => onChange(e.target.value)}
            className="w-10 h-8 rounded cursor-pointer border border-gray-300"
          />
        </div>
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={String(value ?? '')}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
      />
    </div>
  );
}

// ─── Main page component ───

export default function BuilderPage() {
  const { storeId } = useParams<{ storeId: string }>();

  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [storeName, setStoreName] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPalette, setShowAddPalette] = useState(false);

  // Tab & preview state
  const [activeTab, setActiveTab] = useState<TabId>('blocks');
  const [storeData, setStoreData] = useState<Partial<V3StoreData>>({});
  const [iframeKey, setIframeKey] = useState(0);
  const [previewPath, setPreviewPath] = useState('');

  // Options tab state
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  // News tab state
  const [newsItems, setNewsItems] = useState<StoreNewsItem[]>([]);

  // Fetch store data on mount
  useEffect(() => {
    async function load() {
      try {
        const [storeRes, layoutRes] = await Promise.all([
          fetch(`/api/v3/stores/${storeId}`),
          fetch(`/api/admin/stores/${storeId}/layout`),
        ]);

        if (!storeRes.ok) {
          setError('Failed to load store');
          setLoading(false);
          return;
        }

        const fetchedStoreData = await storeRes.json();
        setStoreName(fetchedStoreData.store_name || storeId);
        setStoreData(fetchedStoreData);

        // Parse custom_services
        try {
          const parsed = JSON.parse(fetchedStoreData.custom_services || '[]');
          setServiceOptions(Array.isArray(parsed) ? parsed : []);
        } catch {
          setServiceOptions([]);
        }

        // Parse store_news
        try {
          const parsed = JSON.parse(fetchedStoreData.store_news || '[]');
          setNewsItems(Array.isArray(parsed) ? parsed : []);
        } catch {
          setNewsItems([]);
        }

        let pageLayoutJson: string | undefined;
        if (layoutRes.ok) {
          const layoutData = await layoutRes.json();
          pageLayoutJson = layoutData.page_layout ?? undefined;
        }

        const layout = parsePageLayout(pageLayoutJson, {
          hero_title: fetchedStoreData.hero_title,
          hero_subtitle: fetchedStoreData.hero_subtitle,
          hero_image_url: fetchedStoreData.hero_image_url,
          has_booth: fetchedStoreData.has_booth,
          level1_staff_count: fetchedStoreData.level1_staff_count,
          level2_staff_count: fetchedStoreData.level2_staff_count,
        });

        setBlocks(layout.blocks);
      } catch (e) {
        setError('Failed to load builder data');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storeId]);

  // Mark dirty on any block change
  const updateBlocks = useCallback((updater: (prev: PageBlock[]) => PageBlock[]) => {
    setBlocks((prev) => {
      const next = updater(prev);
      setDirty(true);
      return next;
    });
  }, []);

  // Update a single store data field
  function updateStoreField(field: keyof V3StoreData, value: string) {
    setStoreData((prev) => {
      // Convert types for numeric / boolean fields
      const numericFields: (keyof V3StoreData)[] = [
        'lat', 'lng', 'parking_spaces', 'discount_rate',
        'level1_staff_count', 'level2_staff_count', 'price_multiplier',
        'min_price_limit',
      ];
      const booleanFields: (keyof V3StoreData)[] = ['has_booth'];

      let parsed: string | number | boolean = value;
      if (numericFields.includes(field)) {
        parsed = value === '' ? 0 : Number(value);
      } else if (booleanFields.includes(field)) {
        parsed = value === 'true';
      }

      return { ...prev, [field]: parsed };
    });
    setDirty(true);
  }

  // ─── Pricing tab helpers ───

  function getPricingBlock(): PageBlock | undefined {
    return blocks.find(b => b.type === 'pricing');
  }

  function getPricingBlurFields(): string[] {
    const pb = getPricingBlock();
    if (!pb) return [];
    return (pb.config as PricingConfig).blur_fields ?? [];
  }

  function updatePricingBlur(blurFields: string[]) {
    updateBlocks(prev => prev.map(b =>
      b.type === 'pricing' ? { ...b, config: { ...b.config, blur_fields: blurFields } } : b
    ));
  }

  function togglePricingBlur(key: string) {
    const current = getPricingBlurFields();
    const next = current.includes(key)
      ? current.filter(f => f !== key)
      : [...current, key];
    updatePricingBlur(next);
  }

  function togglePricingBlurAll(field: string) {
    const current = getPricingBlurFields();
    const allKey = `all:${field}`;
    if (current.includes(allKey)) {
      updatePricingBlur(current.filter(f => f !== allKey && !f.endsWith(`:${field}`)));
    } else {
      const cleaned = current.filter(f => !f.endsWith(`:${field}`));
      updatePricingBlur([...cleaned, allKey]);
    }
  }

  // ─── Options tab helpers ───

  function updateServiceOptions(next: ServiceOption[]) {
    setServiceOptions(next);
    setStoreData(prev => ({ ...prev, custom_services: JSON.stringify(next) }));
    setDirty(true);
  }

  function addServiceOption() {
    const newOpt: ServiceOption = {
      id: `svc_${Date.now()}`,
      name: '',
      description: '',
      price: 0,
      category: '',
    };
    updateServiceOptions([...serviceOptions, newOpt]);
  }

  function updateServiceOption(id: string, field: keyof ServiceOption, value: string | number) {
    updateServiceOptions(serviceOptions.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  }

  function deleteServiceOption(id: string) {
    updateServiceOptions(serviceOptions.filter(s => s.id !== id));
  }

  // ─── News tab helpers ───

  function updateNewsItems(next: StoreNewsItem[]) {
    setNewsItems(next);
    setStoreData(prev => ({ ...prev, store_news: JSON.stringify(next) }));
    setDirty(true);
  }

  function addNewsItem() {
    const newItem: StoreNewsItem = {
      id: `news_${Date.now()}`,
      title: '',
      content: '',
      date: new Date().toISOString().slice(0, 10),
      visible: true,
    };
    updateNewsItems([...newsItems, newItem]);
  }

  function updateNewsItem(id: string, field: keyof StoreNewsItem, value: string | boolean) {
    updateNewsItems(newsItems.map(n =>
      n.id === id ? { ...n, [field]: value } : n
    ));
  }

  function deleteNewsItem(id: string) {
    updateNewsItems(newsItems.filter(n => n.id !== id));
  }

  // Drag end handler
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    updateBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((b, i) => ({ ...b, order: i }));
    });
  }

  // Toggle visibility
  function handleToggleVisibility(blockId: string) {
    updateBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, visible: !b.visible } : b))
    );
  }

  // Toggle expand/collapse
  function handleToggleExpand(blockId: string) {
    setSelectedBlockId((prev) => (prev === blockId ? null : blockId));
  }

  // Delete block
  function handleDelete(blockId: string) {
    updateBlocks((prev) =>
      prev.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, order: i }))
    );
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }

  // Update block config
  function handleUpdateConfig(blockId: string, newConfig: Record<string, unknown>) {
    updateBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, config: newConfig as PageBlock['config'] } : b))
    );
  }

  // Add block
  function handleAddBlock(type: BlockType) {
    const newBlock = createBlock(type, blocks.length);
    updateBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    setShowAddPalette(false);
  }

  // Save both layout and store data
  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const results = await Promise.all([
        // Save layout
        fetch(`/api/admin/stores/${storeId}/layout`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            layout: serializePageLayout({ version: 2, blocks }),
          }),
        }),
        // Save store data (includes custom_services, store_news from storeData)
        fetch(`/api/v3/stores/${storeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(storeData),
        }),
      ]);

      for (const res of results) {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Save failed');
        }
      }

      setDirty(false);
      // Refresh preview
      setIframeKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading builder...</p>
      </div>
    );
  }

  // ─── Tab definitions ───

  const tabs: { id: TabId; label: string }[] = [
    { id: 'blocks', label: 'ブロック編集' },
    { id: 'settings', label: '店舗設定' },
    { id: 'pricing', label: '料金・割引' },
    { id: 'options', label: 'オプション' },
    { id: 'news', label: 'お知らせ' },
  ];

  const blurFields = getPricingBlurFields();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Page Builder</h1>
          <p className="text-sm text-gray-500">{storeName}</p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
              saving || !dirty
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Two-panel layout */}
      <div className="flex gap-6">
        {/* Left panel: tabs + content */}
        <div className="flex-1 min-w-0">
          {/* Tab bar */}
          <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content: Blocks */}
          {activeTab === 'blocks' && (
            <div>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map((block) => (
                    <SortableBlockItem
                      key={block.id}
                      block={block}
                      isExpanded={selectedBlockId === block.id}
                      onToggleVisibility={() => handleToggleVisibility(block.id)}
                      onToggleExpand={() => handleToggleExpand(block.id)}
                      onDelete={() => handleDelete(block.id)}
                    >
                      <BlockEditorSwitch
                        block={block}
                        onUpdateConfig={(config) => handleUpdateConfig(block.id, config)}
                      />
                    </SortableBlockItem>
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add Block button */}
              <div className="relative mt-3">
                <button
                  onClick={() => setShowAddPalette((v) => !v)}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  + Add Block
                </button>

                {/* Block palette dropdown */}
                {showAddPalette && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
                    {BLOCK_META.map((meta) => {
                      const existingCount = blocks.filter((b) => b.type === meta.type).length;
                      const atMax = meta.maxInstances !== undefined && existingCount >= meta.maxInstances;
                      return (
                        <button
                          key={meta.type}
                          onClick={() => handleAddBlock(meta.type)}
                          disabled={atMax}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                            atMax
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-700 hover:bg-blue-50'
                          }`}
                        >
                          <span>{meta.icon}</span>
                          <span className="flex-1">{meta.labelJa}</span>
                          {atMax && <span className="text-xs text-gray-400">Max</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab content: Store Settings */}
          {activeTab === 'settings' && storeData && (
            <div className="space-y-6">
              {/* Section: 基本情報 */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">基本情報</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField label="店舗名" value={storeData.store_name} onChange={v => updateStoreField('store_name', v)} />
                  <SettingsField label="電話番号" value={storeData.tel} onChange={v => updateStoreField('tel', v)} />
                  <SettingsField label="メールアドレス" value={storeData.email} onChange={v => updateStoreField('email', v)} />
                  <SettingsField label="郵便番号" value={storeData.postal_code} onChange={v => updateStoreField('postal_code', v)} />
                  <SettingsField label="都道府県" value={storeData.prefecture} onChange={v => updateStoreField('prefecture', v)} />
                  <SettingsField label="市区町村" value={storeData.city} onChange={v => updateStoreField('city', v)} />
                  <SettingsField label="住所" value={storeData.address} onChange={v => updateStoreField('address', v)} />
                  <SettingsField label="営業時間" value={storeData.business_hours} onChange={v => updateStoreField('business_hours', v)} />
                  <SettingsField label="定休日" value={storeData.regular_holiday} onChange={v => updateStoreField('regular_holiday', v)} />
                </div>
              </div>

              {/* Section: キャンペーン */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">キャンペーン</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField label="キャンペーンタイトル" value={storeData.campaign_title} onChange={v => updateStoreField('campaign_title', v)} />
                  <SettingsField label="キャンペーン期限" value={storeData.campaign_deadline} onChange={v => updateStoreField('campaign_deadline', v)} />
                  <SettingsField label="割引率 (%)" value={storeData.discount_rate} onChange={v => updateStoreField('discount_rate', v)} type="number" />
                  <SettingsField label="キャンペーンカラー" value={storeData.campaign_color_code} onChange={v => updateStoreField('campaign_color_code', v)} type="color" />
                </div>
              </div>

              {/* Section: SEO */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">SEO</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField label="ヒーロータイトル" value={storeData.hero_title} onChange={v => updateStoreField('hero_title', v)} />
                  <SettingsField label="ヒーローサブタイトル" value={storeData.hero_subtitle} onChange={v => updateStoreField('hero_subtitle', v)} />
                  <SettingsField label="説明文" value={storeData.description} onChange={v => updateStoreField('description', v)} type="textarea" rows={4} />
                  <SettingsField label="メタディスクリプション" value={storeData.meta_description} onChange={v => updateStoreField('meta_description', v)} type="textarea" rows={3} />
                  <SettingsField label="SEOキーワード" value={storeData.seo_keywords} onChange={v => updateStoreField('seo_keywords', v)} type="textarea" rows={2} />
                </div>
              </div>

              {/* Section: 画像 */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">画像</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField label="ヒーロー画像URL" value={storeData.hero_image_url} onChange={v => updateStoreField('hero_image_url', v)} />
                  <SettingsField label="ロゴURL" value={storeData.logo_url} onChange={v => updateStoreField('logo_url', v)} />
                  <SettingsField label="スタッフ写真URL" value={storeData.staff_photo_url} onChange={v => updateStoreField('staff_photo_url', v)} />
                  <SettingsField label="店舗外観URL" value={storeData.store_exterior_url} onChange={v => updateStoreField('store_exterior_url', v)} />
                  <SettingsField label="店舗内装URL" value={storeData.store_interior_url} onChange={v => updateStoreField('store_interior_url', v)} />
                  <SettingsField label="ビフォーアフターURL" value={storeData.before_after_url} onChange={v => updateStoreField('before_after_url', v)} />
                  <SettingsField label="キャンペーンバナーURL" value={storeData.campaign_banner_url} onChange={v => updateStoreField('campaign_banner_url', v)} />
                </div>
              </div>

              {/* Section: LINE */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">LINE</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField label="LINE URL" value={storeData.line_url} onChange={v => updateStoreField('line_url', v)} />
                </div>
              </div>

              {/* Section: 位置 */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">位置</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField label="緯度 (lat)" value={storeData.lat} onChange={v => updateStoreField('lat', v)} type="number" />
                  <SettingsField label="経度 (lng)" value={storeData.lng} onChange={v => updateStoreField('lng', v)} type="number" />
                  <SettingsField label="駐車場台数" value={storeData.parking_spaces} onChange={v => updateStoreField('parking_spaces', v)} type="number" />
                  <SettingsField label="ランドマーク" value={storeData.landmark} onChange={v => updateStoreField('landmark', v)} />
                  <SettingsField label="最寄り駅" value={storeData.nearby_stations} onChange={v => updateStoreField('nearby_stations', v)} />
                </div>
              </div>

              {/* Section: 機能 */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">機能</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField label="専用ブースあり" value={storeData.has_booth} onChange={v => updateStoreField('has_booth', v)} type="checkbox" />
                  <SettingsField label="1級スタッフ数" value={storeData.level1_staff_count} onChange={v => updateStoreField('level1_staff_count', v)} type="number" />
                  <SettingsField label="2級スタッフ数" value={storeData.level2_staff_count} onChange={v => updateStoreField('level2_staff_count', v)} type="number" />
                  <SettingsField label="Google Place ID" value={storeData.google_place_id} onChange={v => updateStoreField('google_place_id', v)} />
                  <SettingsField label="価格倍率" value={storeData.price_multiplier} onChange={v => updateStoreField('price_multiplier', v)} type="number" />
                </div>
              </div>
            </div>
          )}

          {/* Tab content: Pricing */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              {/* Pricing fields */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">料金設定</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField label="割引率 (%)" value={storeData.discount_rate} onChange={v => updateStoreField('discount_rate', v)} type="number" />
                  <SettingsField label="価格倍率" value={storeData.price_multiplier} onChange={v => updateStoreField('price_multiplier', v)} type="number" />
                  <SettingsField label="最低価格制限" value={storeData.min_price_limit} onChange={v => updateStoreField('min_price_limit', v)} type="number" />
                </div>
              </div>

              {/* Campaign settings */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">キャンペーン</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField label="キャンペーンタイトル" value={storeData.campaign_title} onChange={v => updateStoreField('campaign_title', v)} />
                  <SettingsField label="キャンペーン期限" value={storeData.campaign_deadline} onChange={v => updateStoreField('campaign_deadline', v)} />
                  <SettingsField label="キャンペーンカラー" value={storeData.campaign_color_code} onChange={v => updateStoreField('campaign_color_code', v)} type="color" />
                </div>
              </div>

              {/* Per-tier blur controls */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">料金ブラー設定（全コース）</h3>
                {!getPricingBlock() ? (
                  <p className="text-xs text-gray-400">料金ブロックが追加されていません。ブロック編集タブで追加してください。</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 pr-2">コース名</th>
                        <th className="text-center py-1.5 px-2">料金ブラー</th>
                        <th className="text-center py-1.5 px-2">メンテブラー</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* All tiers toggle */}
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <td className="py-2 pr-2 font-semibold">全コース</td>
                        <td className="text-center py-2">
                          <input
                            type="checkbox"
                            checked={blurFields.includes('all:web_price')}
                            onChange={() => togglePricingBlurAll('web_price')}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="text-center py-2">
                          <input
                            type="checkbox"
                            checked={blurFields.includes('all:maintenance_price')}
                            onChange={() => togglePricingBlurAll('maintenance_price')}
                            className="rounded border-gray-300"
                          />
                        </td>
                      </tr>
                      {/* Individual tiers */}
                      {coatingTiers.map(tier => {
                        const isAllWeb = blurFields.includes('all:web_price');
                        const isAllMaint = blurFields.includes('all:maintenance_price');
                        return (
                          <tr key={tier.id} className="border-b border-gray-100">
                            <td className="py-2 pr-2">{tier.name}</td>
                            <td className="text-center py-2">
                              <input
                                type="checkbox"
                                checked={isAllWeb || blurFields.includes(`${tier.id}:web_price`)}
                                disabled={isAllWeb}
                                onChange={() => togglePricingBlur(`${tier.id}:web_price`)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="text-center py-2">
                              <input
                                type="checkbox"
                                checked={isAllMaint || blurFields.includes(`${tier.id}:maintenance_price`)}
                                disabled={isAllMaint}
                                onChange={() => togglePricingBlur(`${tier.id}:maintenance_price`)}
                                className="rounded border-gray-300"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Tab content: Options */}
          {activeTab === 'options' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">カスタムサービス一覧</h3>
                <button
                  onClick={addServiceOption}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + 追加
                </button>
              </div>

              {serviceOptions.length === 0 && (
                <p className="text-xs text-gray-400 py-4 text-center">サービスオプションがありません。「+ 追加」で作成してください。</p>
              )}

              {serviceOptions.map((opt, idx) => (
                <div key={opt.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500">#{idx + 1}</span>
                    <button
                      onClick={() => deleteServiceOption(opt.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">サービス名</label>
                      <input
                        type="text"
                        value={opt.name}
                        onChange={e => updateServiceOption(opt.id, 'name', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">カテゴリ</label>
                      <input
                        type="text"
                        value={opt.category}
                        onChange={e => updateServiceOption(opt.id, 'category', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">価格（円）</label>
                      <input
                        type="number"
                        value={opt.price}
                        onChange={e => updateServiceOption(opt.id, 'price', Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">説明</label>
                      <textarea
                        value={opt.description}
                        onChange={e => updateServiceOption(opt.id, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab content: News */}
          {activeTab === 'news' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">お知らせ一覧</h3>
                <button
                  onClick={addNewsItem}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + 追加
                </button>
              </div>

              {newsItems.length === 0 && (
                <p className="text-xs text-gray-400 py-4 text-center">お知らせがありません。「+ 追加」で作成してください。</p>
              )}

              {newsItems.map((item, idx) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500">#{idx + 1}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={item.visible}
                          onChange={e => updateNewsItem(item.id, 'visible', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        表示
                      </label>
                      <button
                        onClick={() => deleteNewsItem(item.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">タイトル</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={e => updateNewsItem(item.id, 'title', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">日付</label>
                      <input
                        type="date"
                        value={item.date}
                        onChange={e => updateNewsItem(item.id, 'date', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">内容</label>
                      <textarea
                        value={item.content}
                        onChange={e => updateNewsItem(item.id, 'content', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: iframe preview */}
        <div className="w-[400px] flex-shrink-0 hidden lg:block">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden h-[calc(100vh-120px)] lg:sticky lg:top-6 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Preview</span>
                <select
                  value={previewPath}
                  onChange={e => setPreviewPath(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="">ホーム</option>
                  <option value="/coatings">料金メニュー</option>
                  <option value="/booking">予約</option>
                  <option value="/cases">施工事例</option>
                  <option value="/access">アクセス</option>
                  <option value="/options">オプション</option>
                  <option value="/news">お知らせ</option>
                  <option value="/price">シミュレーター</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIframeKey((k) => k + 1)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Refresh
                </button>
                <a
                  href={`/v3/${storeId}${previewPath}`}
                  target="_blank"
                  rel="noopener"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Open
                </a>
              </div>
            </div>
            <iframe
              key={iframeKey}
              src={`/v3/${storeId}${previewPath}`}
              className="flex-1 w-full border-0"
              title="Store Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
