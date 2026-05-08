'use client';

import { useCallback, useMemo, useState } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import {
  parsePageLayout,
  serializePageLayout,
  createBlock,
  BLOCK_META,
  type PageBlock,
  type BlockType,
  type PageLayout,
  type BannerPresetConfig,
} from '@/lib/block-types';
import SortableBlockItem from '@/app/admin/builder/components/SortableBlockItem';
import BlockEditorSwitch from '@/app/admin/builder/components/editors/BlockEditorSwitch';
import BannerPresetPicker from '@/components/admin/BannerPresetPicker';
import TemplateValuesModal from '@/components/admin/TemplateValuesModal';
import { presetToBanner, type BannerPreset } from '@/lib/banner-presets-shared';

export interface LayoutBlocksEditorProps {
  /** JSON string of PageLayout */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Reusable block-layout editor: drag & drop to reorder, toggle visibility,
 * add/delete/configure each block. Consumes and emits the full `PageLayout`
 * JSON string used in both `stores.page_layout` and
 * `site_config/defaults.values.page_layout`.
 */
export default function LayoutBlocksEditor({ value, onChange, disabled }: LayoutBlocksEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showAddPalette, setShowAddPalette] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templatePreset, setTemplatePreset] = useState<BannerPreset | null>(null);

  const layout: PageLayout = useMemo(() => parsePageLayout(value || undefined), [value]);
  const blocks = layout.blocks;

  const emit = useCallback(
    (next: PageBlock[]) => {
      onChange(serializePageLayout({ ...layout, blocks: next }));
    },
    [layout, onChange],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({ ...b, order: i }));
      emit(reordered);
    },
    [blocks, emit],
  );

  function toggleVisibility(id: string) {
    emit(blocks.map(b => (b.id === id ? { ...b, visible: !b.visible } : b)));
  }

  function toggleExpand(id: string) {
    setSelectedBlockId(prev => (prev === id ? null : id));
  }

  function del(id: string) {
    emit(blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i })));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }

  function updateConfig(id: string, config: Record<string, unknown>) {
    emit(blocks.map(b => (b.id === id ? { ...b, config: config as PageBlock['config'] } : b)));
  }

  function addBlock(type: BlockType) {
    if (type === 'banner_preset') {
      setShowAddPalette(false);
      setPickerOpen(true);
      return;
    }
    const nb = createBlock(type, blocks.length);
    emit([...blocks, nb]);
    setSelectedBlockId(nb.id);
    setShowAddPalette(false);
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map(block => (
            <SortableBlockItem
              key={block.id}
              block={block}
              isExpanded={selectedBlockId === block.id}
              onToggleVisibility={() => toggleVisibility(block.id)}
              onToggleExpand={() => toggleExpand(block.id)}
              onDelete={() => del(block.id)}
            >
              <BlockEditorSwitch
                block={block}
                onUpdateConfig={config => updateConfig(block.id, config)}
              />
            </SortableBlockItem>
          ))}
        </SortableContext>
      </DndContext>

      <BannerPresetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={preset => {
          setPickerOpen(false);
          if (preset.is_template) {
            setTemplatePreset(preset);
            return;
          }
          const bannerId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
            ? crypto.randomUUID()
            : `b-${Math.random().toString(36).slice(2)}`;
          const banner = presetToBanner(preset, bannerId);
          const nb = createBlock('banner_preset', blocks.length);
          nb.config = { banner, preset_id: preset.id } as BannerPresetConfig;
          emit([...blocks, nb]);
          setSelectedBlockId(nb.id);
        }}
      />

      <TemplateValuesModal
        open={templatePreset !== null}
        onClose={() => setTemplatePreset(null)}
        preset={templatePreset}
        onSubmit={({ values, preset, cached_html, cached_css, cached_fields }) => {
          const bannerId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
            ? crypto.randomUUID()
            : `b-${Math.random().toString(36).slice(2)}`;
          const banner = {
            id: bannerId,
            template_id: preset.id,
            custom_css: '',
            title: preset.name,
            subtitle: '',
            image_url: '',
            original_price: 0,
            discount_rate: 0,
            link_url: '',
            visible: true,
            mode: 'template' as const,
            template_values: values,
            cached_template_html: cached_html,
            cached_template_css: cached_css,
            cached_template_fields: cached_fields,
          };
          const nb = createBlock('banner_preset', blocks.length);
          nb.config = { banner, preset_id: preset.id } as BannerPresetConfig;
          emit([...blocks, nb]);
          setSelectedBlockId(nb.id);
          setTemplatePreset(null);
        }}
      />

      <div className="relative mt-3">
        <button
          type="button"
          onClick={() => setShowAddPalette(v => !v)}
          className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          + Add Block
        </button>
        {showAddPalette && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
            {BLOCK_META.map(meta => {
              const existingCount = blocks.filter(b => b.type === meta.type).length;
              const atMax = meta.maxInstances !== undefined && existingCount >= meta.maxInstances;
              return (
                <button
                  key={meta.type}
                  type="button"
                  onClick={() => addBlock(meta.type)}
                  disabled={atMax}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    atMax ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-blue-50'
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
  );
}
