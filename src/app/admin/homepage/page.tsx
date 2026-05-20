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

// ─── Local sortable row ───

function SortableHomepageBlock({
  block,
  isEditing,
  onToggleVisibility,
  onToggleEdit,
  onDelete,
  onConfigChange,
}: {
  block: HomepageBlock;
  isEditing: boolean;
  onToggleVisibility: () => void;
  onToggleEdit: () => void;
  onDelete: () => void;
  onConfigChange: (key: string, value: unknown) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const meta = HOMEPAGE_BLOCK_META[block.type];

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
          {Object.entries(block.config).map(([key, value]) => {
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

// ─── Main page ───

export default function HomepagePage() {
  const user = useAdminAuth();
  const [blocks, setBlocks] = useState<HomepageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);

  useEffect(() => {
    fetch('/api/admin/homepage')
      .then(r => r.json())
      .then(data => {
        if (data.layout?.blocks && Array.isArray(data.layout.blocks) && data.layout.blocks.length > 0) {
          setBlocks(data.layout.blocks);
        } else {
          setBlocks(DEFAULT_HOMEPAGE_BLOCKS);
        }
      })
      .catch(() => setBlocks(DEFAULT_HOMEPAGE_BLOCKS))
      .finally(() => setLoading(false));
  }, []);

  if (user.role !== 'super_admin') {
    return <div className="p-8 text-gray-500">この機能はスーパー管理者のみ使用できます。</div>;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });
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
    const meta = HOMEPAGE_BLOCK_META[type];
    const existingIds = new Set(blocks.map(b => b.id));
    const baseId = type.replace(/_/g, '-');
    let newId = baseId;
    let counter = 2;
    while (existingIds.has(newId)) { newId = `${baseId}-${counter}`; counter++; }

    const template = DEFAULT_HOMEPAGE_BLOCKS.find(b => b.type === type);
    const newBlock: HomepageBlock = {
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

      {showPalette && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">追加するブロックを選択</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(HOMEPAGE_BLOCK_META).map(([type, meta]) => (
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
              <SortableHomepageBlock
                key={block.id}
                block={block}
                isEditing={editingBlock === block.id}
                onToggleVisibility={() => toggleVisibility(block.id)}
                onToggleEdit={() => setEditingBlock(editingBlock === block.id ? null : block.id)}
                onDelete={() => deleteBlock(block.id)}
                onConfigChange={(key, value) => updateBlockConfig(block.id, key, value)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
