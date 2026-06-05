import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getChecklistItems,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  reorderChecklist,
} from '../lib/checklist';
import type { ChecklistItem } from '../types';

interface ChecklistSectionProps {
  projectId: string;
}

// Apple-Notes-style scope checklist. Any assigned user can add, check, edit,
// reorder, and delete. Reordering uses @dnd-kit so press-and-drag works on
// touch (long-press the handle) and mouse alike. Interactions are optimistic.
export default function ChecklistSection({ projectId }: ChecklistSectionProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newText, setNewText] = useState('');

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const newInputRef = useRef<HTMLInputElement>(null);

  // Sensors: mouse drags after a small move; touch needs a short long-press so
  // dragging the handle doesn't fight list scrolling; keyboard for a11y.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getChecklistItems(projectId);
        if (active) setItems(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load checklist.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId]);

  const total = items.length;
  const doneCount = items.filter((i) => i.done).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  // --- toggle (optimistic) ---
  async function toggle(item: ChecklistItem) {
    const next = !item.done;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: next } : i)));
    try {
      await updateChecklistItem(item.id, { done: next });
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: item.done } : i)));
      setError(err instanceof Error ? err.message : 'Could not update item.');
    }
  }

  // --- add (rapid entry: Enter keeps focus for the next item) ---
  async function addItem() {
    const text = newText.trim();
    if (!text) return;
    setNewText('');
    setError(null);
    try {
      const created = await addChecklistItem(projectId, text, items.length);
      setItems((prev) => [...prev, created]);
    } catch (err) {
      setNewText(text);
      setError(err instanceof Error ? err.message : 'Could not add item.');
    } finally {
      newInputRef.current?.focus();
    }
  }

  function onNewKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void addItem();
    }
  }

  // --- inline edit ---
  function startEdit(item: ChecklistItem) {
    setEditingId(item.id);
    setEditingText(item.text);
  }
  async function commitEdit() {
    if (!editingId) return;
    const id = editingId;
    const text = editingText.trim();
    const original = items.find((i) => i.id === id);
    setEditingId(null);
    if (!original || text === original.text) return;
    if (!text) {
      await remove(original);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
    try {
      await updateChecklistItem(id, { text });
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, text: original.text } : i)));
      setError(err instanceof Error ? err.message : 'Could not rename item.');
    }
  }

  // --- delete (optimistic) ---
  async function remove(item: ChecklistItem) {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== item.id));
    try {
      await deleteChecklistItem(item.id);
    } catch (err) {
      setItems(prev);
      setError(err instanceof Error ? err.message : 'Could not delete item.');
    }
  }

  // --- reorder (optimistic) ---
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const prev = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    try {
      await reorderChecklist(next.map((it, idx) => ({ id: it.id, position: idx })));
    } catch (err) {
      setItems(prev);
      setError(err instanceof Error ? err.message : 'Could not reorder.');
    }
  }

  if (loading) return <p className="muted-note">Loading checklist…</p>;

  return (
    <section className="card">
      <div className="card__head">
        <h3 className="card__title">Checklist</h3>
        {total > 0 && (
          <span className="check-count">
            {doneCount} of {total} done
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="check-progress" aria-hidden="true">
          <div className="check-progress__fill" style={{ width: `${pct}%` }} />
        </div>
      )}

      {error && <div className="banner banner--error">{error}</div>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="check-list">
            {items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                editing={editingId === item.id}
                editingText={editingText}
                setEditingText={setEditingText}
                onToggle={() => toggle(item)}
                onStartEdit={() => startEdit(item)}
                onCommitEdit={commitEdit}
                onCancelEdit={() => setEditingId(null)}
                onDelete={() => remove(item)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {/* Add row — type and press Enter to keep going */}
      <div className="check-add">
        <span className="check-box check-box--ghost" aria-hidden="true" />
        <input
          ref={newInputRef}
          className="check-add__input"
          value={newText}
          placeholder="Add an item…"
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={onNewKeyDown}
        />
        {newText.trim() && (
          <button type="button" className="link-btn" onClick={() => void addItem()}>
            Add
          </button>
        )}
      </div>
    </section>
  );
}

interface SortableItemProps {
  item: ChecklistItem;
  editing: boolean;
  editingText: string;
  setEditingText: (v: string) => void;
  onToggle: () => void;
  onStartEdit: () => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

function SortableItem({
  item,
  editing,
  editingText,
  setEditingText,
  onToggle,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onDelete,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`check-item${item.done ? ' check-item--done' : ''}${isDragging ? ' check-item--dragging' : ''}`}
    >
      {/* drag handle — only this starts a drag, so checkbox/text/scroll are free */}
      <span
        className="check-item__handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        ⠿
      </span>

      <button
        type="button"
        className="check-box"
        role="checkbox"
        aria-checked={item.done}
        onClick={onToggle}
      >
        {item.done && (
          <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {editing ? (
        <input
          className="check-item__edit"
          value={editingText}
          autoFocus
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={onCommitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onCommitEdit();
            } else if (e.key === 'Escape') {
              onCancelEdit();
            }
          }}
        />
      ) : (
        <span className="check-item__text" onClick={onStartEdit}>
          {item.text}
        </span>
      )}

      <button type="button" className="check-item__del" aria-label="Delete item" onClick={onDelete}>
        ×
      </button>
    </li>
  );
}
