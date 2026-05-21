'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DEFAULT_HOMEPAGE_BLOCKS,
  HOMEPAGE_BLOCK_META,
  type HomepageBlock,
} from '@/lib/homepage-blocks';
import {
  DEFAULT_AREA_BLOCKS,
  AREA_BLOCK_META,
  type AreaBlock,
  type AreaBannerRef,
  type AreaBannerSource,
  collectAreaBanners,
} from '@/lib/area-blocks';

const MAX_AREA_BANNERS = 4;

// ─── Unified block type for the editor ───

type EditorBlock = HomepageBlock | AreaBlock;

// ─── Banner picker for area_banners block ───

interface AreaBannersPickerProps {
  areaId: string;
  currentRefs: AreaBannerRef[];
  onChange: (refs: AreaBannerRef[]) => void;
}

function AreaBannersPicker({ areaId, currentRefs, onChange }: AreaBannersPickerProps) {
  const [pool, setPool] = useState<AreaBannerSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/sub-companies/${areaId}/stores`)
      .then(r => r.json())
      .then((data: { stores?: { store_id: string; store_name: string; banners: string; promo_banners: string }[] }) => {
        if (active && data.stores && Array.isArray(data.stores)) {
          setPool(collectAreaBanners(data.stores));
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [areaId]);

  function isSelected(src: AreaBannerSource) {
    return currentRefs.some(r => r.storeId === src.storeId && r.bannerId === src.bannerId);
  }

  function toggleBanner(src: AreaBannerSource) {
    if (isSelected(src)) {
      onChange(currentRefs.filter(r => !(r.storeId === src.storeId && r.bannerId === src.bannerId)));
    } else {
      if (currentRefs.length >= MAX_AREA_BANNERS) return;
      onChange([...currentRefs, { storeId: src.storeId, bannerId: src.bannerId }]);
    }
  }

  if (loading) {
    return <p className="text-xs text-gray-400">バナーを読み込み中...</p>;
  }

  if (pool.length === 0) {
    return <p className="text-xs text-gray-400">このエリアの店舗にバナーがありません。</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        最大{MAX_AREA_BANNERS}枚まで選択できます（{currentRefs.length}/{MAX_AREA_BANNERS}）
      </p>
      <div className="grid grid-cols-2 gap-2">
        {pool.map(src => {
          const selected = isSelected(src);
          const limitReached = !selected && currentRefs.length >= MAX_AREA_BANNERS;
          return (
            <button
              key={`${src.storeId}:${src.bannerId}`}
              onClick={() => toggleBanner(src)}
              disabled={limitReached}
              className={`text-left border rounded-lg p-2 text-xs cursor-pointer transition-colors ${
                selected
                  ? 'border-amber-400 bg-amber-50'
                  : limitReached
                    ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              {src.banner.image_url && (
                <img
                  src={src.banner.image_url}
                  alt={src.banner.title}
                  className="w-full h-16 object-cover rounded mb-1"
                />
              )}
              <div className="font-semibold text-[#0C3290] truncate">
                {src.banner.title || src.bannerId}
              </div>
              <div className="text-gray-400 truncate">{src.storeName}</div>
              {selected && (
                <div className="text-amber-600 font-bold mt-1">✓ 選択済み</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Local sortable row ───

function SortableEditorBlock({
  block,
  isEditing,
  onToggleVisibility,
  onToggleEdit,
  onDelete,
  onConfigChange,
  metaMap,
  areaId,
}: {
  block: EditorBlock;
  isEditing: boolean;
  onToggleVisibility: () => void;
  onToggleEdit: () => void;
  onDelete: () => void;
  onConfigChange: (key: string, value: unknown) => void;
  metaMap: Record<string, { labelJa: string; icon: string }>;
  areaId?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const meta = metaMap[block.type];

  return (
    <div ref={setNodeRef} style={style} className={`bg-white border rounded-xl mb-2 transition-opacity ${!block.visible ? 'opacity-50 border-gray-100' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-400 hover:text-gray-600 text-lg leading-none select-none"
          aria-label="ドラッグして並べ替え"
        >
          &#8801;
        </button>
        <span className="text-sm">{meta?.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-[#0C3290]">{block.label}</div>
          <div className="text-[10px] text-gray-400">{block.type}</div>
        </div>
        <button
          onClick={onToggleEdit}
          className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer"
        >
          {isEditing ? '閉じる' : '編集'}
        </button>
        <button
          onClick={onToggleVisibility}
          className={`text-xs px-2 py-1 rounded cursor-pointer ${block.visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
        >
          {block.visible ? '表示中' : '非表示'}
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
          aria-label="ブロックを削除"
        >
          &#x2715;
        </button>
      </div>

      {isEditing && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3">
          {block.type === 'area_banners' && areaId ? (
            <AreaBannersPicker
              areaId={areaId}
              currentRefs={
                Array.isArray((block.config as { refs?: AreaBannerRef[] }).refs)
                  ? (block.config as { refs: AreaBannerRef[] }).refs
                  : []
              }
              onChange={refs => onConfigChange('refs', refs)}
            />
          ) : Object.entries(block.config).map(([key, value]) => {
            if (typeof value === 'string') {
              return (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{key}</label>
                  {value.length > 80 ? (
                    <textarea
                      value={value}
                      onChange={e => onConfigChange(key, e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={e => onConfigChange(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  )}
                </div>
              );
            }
            if (typeof value === 'boolean') {
              return (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={e => onConfigChange(key, e.target.checked)}
                  />
                  {key}
                </label>
              );
            }
            if (typeof value === 'number') {
              return (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{key}</label>
                  <input
                    type="number"
                    value={value}
                    onChange={e => onConfigChange(key, Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              );
            }
            if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
              return (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{key} (JSON)</label>
                  <textarea
                    value={JSON.stringify(value, null, 2)}
                    onChange={e => {
                      try { onConfigChange(key, JSON.parse(e.target.value)); } catch { /* invalid json */ }
                    }}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

// ─── Types ───

interface SubCompanyOption {
  id: string;
  name: string;
  slug: string;
}

// ─── Main page ───

export default function HomepagePage() {
  const user = useAdminAuth();

  // 'main' = site homepage; area id string = area hub
  const [target, setTarget] = useState<'main' | string>('main');
  const [areas, setAreas] = useState<SubCompanyOption[]>([]);
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);

  const isAreaMode = target !== 'main';
  const activeMetaMap = isAreaMode ? AREA_BLOCK_META : HOMEPAGE_BLOCK_META;
  const activeDefaults = isAreaMode ? DEFAULT_AREA_BLOCKS : DEFAULT_HOMEPAGE_BLOCKS;

  // Load sub-companies list once
  useEffect(() => {
    fetch('/api/admin/sub-companies')
      .then(r => r.json())
      .then((data: SubCompanyOption[]) => {
        if (Array.isArray(data)) setAreas(data);
      })
      .catch(() => { /* ignore */ });
  }, []);

  // Load layout when target changes
  useEffect(() => {
    setLoading(true);
    setBlocks([]);
    setEditingBlock(null);

    const url = target === 'main'
      ? '/api/admin/homepage'
      : `/api/admin/sub-companies/${target}/layout`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (target === 'main') {
          if (data.layout?.blocks && Array.isArray(data.layout.blocks) && data.layout.blocks.length > 0) {
            setBlocks(data.layout.blocks);
          } else {
            setBlocks(DEFAULT_HOMEPAGE_BLOCKS);
          }
        } else {
          if (data.layout && Array.isArray(data.layout) && data.layout.length > 0) {
            setBlocks(data.layout);
          } else {
            setBlocks(DEFAULT_AREA_BLOCKS);
          }
        }
      })
      .catch(() => setBlocks(activeDefaults))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (user.role !== 'super_admin') {
    return <div className="p-8 text-gray-500">この機能はスーパー管理者のみ使用できます。</div>;
  }

  async function handleSave() {
    setSaving(true);
    try {
      let res: Response;
      if (target === 'main') {
        res = await fetch('/api/admin/homepage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks }),
        });
      } else {
        res = await fetch(`/api/admin/sub-companies/${target}/layout`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks }),
        });
      }
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { alert('保存に失敗しました'); }
    setSaving(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks(prev => {
      const oldIndex = prev.findIndex(b => b.id === active.id);
      const newIndex = prev.findIndex(b => b.id === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((b, i) => ({ ...b, order: i }));
    });
  }

  function toggleVisibility(id: string) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, visible: !b.visible } : b));
  }

  function deleteBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i })));
  }

  function updateBlockConfig(id: string, key: string, value: unknown) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, config: { ...b.config, [key]: value } } : b));
  }

  function addBlock(type: string) {
    const meta = activeMetaMap[type];
    const existingIds = new Set(blocks.map(b => b.id));
    const baseId = type.replace(/_/g, '-');
    let newId = baseId;
    let counter = 2;
    while (existingIds.has(newId)) { newId = `${baseId}-${counter}`; counter++; }

    const template = activeDefaults.find(b => b.type === type);
    const newBlock: EditorBlock = {
      id: newId,
      type,
      label: meta?.labelJa || type,
      visible: true,
      order: blocks.length,
      config: template?.config ?? {},
    };
    setBlocks(prev => [...prev, newBlock]);
    setShowPalette(false);
  }

  if (loading) return <div className="p-8 text-gray-400">読み込み中...</div>;

  const sorted = [...blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">トップページ設定</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-600 font-semibold">✓ 保存しました</span>}
          <button
            onClick={() => setShowPalette(v => !v)}
            className="px-4 py-2 bg-white border border-gray-300 text-[#0C3290] rounded-lg text-sm font-semibold cursor-pointer hover:bg-gray-50"
          >
            + ブロック追加
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-amber-500 text-[#0C3290] rounded-lg text-sm font-bold cursor-pointer hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className="block text-xs font-semibold text-gray-500 mb-2">編集対象</label>
        <select
          value={target}
          onChange={e => setTarget(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="main">メインホームページ</option>
          {areas.map(area => (
            <option key={area.id} value={area.id}>{area.name}（エリアページ）</option>
          ))}
        </select>
      </div>

      {showPalette && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">追加するブロックを選択</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(activeMetaMap).map(([type, meta]) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:border-amber-300 hover:bg-amber-50 text-left cursor-pointer"
              >
                <span>{meta.icon}</span>
                <span className="text-xs font-semibold text-[#0C3290]">{meta.labelJa}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">セクションのドラッグ並び替え、表示/非表示、テキスト編集ができます。</p>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <div>
            {sorted.map(block => (
              <SortableEditorBlock
                key={block.id}
                block={block}
                isEditing={editingBlock === block.id}
                onToggleVisibility={() => toggleVisibility(block.id)}
                onToggleEdit={() => setEditingBlock(editingBlock === block.id ? null : block.id)}
                onDelete={() => deleteBlock(block.id)}
                onConfigChange={(key, value) => updateBlockConfig(block.id, key, value)}
                metaMap={activeMetaMap}
                areaId={isAreaMode ? target : undefined}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
