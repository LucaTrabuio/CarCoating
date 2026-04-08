'use client';

import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getBlockMeta, type PageBlock } from '@/lib/block-types';

interface SortableBlockItemProps {
  block: PageBlock;
  isExpanded: boolean;
  onToggleVisibility: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
  children?: ReactNode;
}

export default function SortableBlockItem({
  block,
  isExpanded,
  onToggleVisibility,
  onToggleExpand,
  onDelete,
  children,
}: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: block.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const meta = getBlockMeta(block.type);

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-gray-200 rounded-lg mb-2">
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-400 hover:text-gray-600 text-lg leading-none select-none"
          aria-label="Drag to reorder"
        >
          &#8801;
        </button>
        {/* Icon */}
        <span className="text-sm">{meta?.icon}</span>
        {/* Label */}
        <span className="text-sm font-semibold flex-1">{meta?.labelJa || block.type}</span>
        {/* Visibility toggle */}
        <button
          onClick={onToggleVisibility}
          className={`text-sm ${block.visible ? 'text-blue-500' : 'text-gray-300'}`}
          aria-label={block.visible ? 'Hide block' : 'Show block'}
        >
          {block.visible ? '\u{1F441}' : '\u{1F441}\u200D\u{1F5E8}'}
        </button>
        {/* Expand/collapse */}
        <button
          onClick={onToggleExpand}
          className="text-sm text-gray-400 hover:text-gray-600"
          aria-label={isExpanded ? 'Collapse editor' : 'Expand editor'}
        >
          {isExpanded ? '\u25B2' : '\u25BC'}
        </button>
        {/* Delete */}
        <button
          onClick={onDelete}
          className="text-sm text-red-400 hover:text-red-600"
          aria-label="Delete block"
        >
          &#x2715;
        </button>
      </div>
      {/* Editor panel */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-3 py-3 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  );
}
