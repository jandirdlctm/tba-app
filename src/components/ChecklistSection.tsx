import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
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

const byPosition = (a: ChecklistItem, b: ChecklistItem) => a.position - b.position;

// Apple-Notes-style scope checklist. Any assigned user can add, check, edit,
// reorder, and delete. Checked items sink to the bottom so the to-dos stay on
// top. Reordering applies only to the active (unchecked) items: drag the handle
// on desktop, or use the up/down buttons (the only control shown on phones,
// where the handle is hidden). Interactions are optimistic.
export default function ChecklistSection({ projectId }: ChecklistSectionProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newText, setNewText] = useState('');

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Drag reorder (pointer devices only)
  const dragId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

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

  // Display order: active items (by manual position) first, then completed.
  const active = items.filter((i) => !i.done).sort(byPosition);
  const completed = items.filter((i) => i.done).sort(byPosition);

  // --- toggle (optimistic) — checking an item lets it sink to the bottom ---
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
      setNewText(text); // restore so the user doesn't lose it
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
      await remove(original); // emptying an item deletes it (Apple-Notes behavior)
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

  // --- reorder (active items only) ---
  async function persistOrder(nextActive: ChecklistItem[]) {
    const next = [...nextActive, ...completed].map((it, idx) => ({ ...it, position: idx }));
    setItems(next);
    try {
      await reorderChecklist(next.map((it) => ({ id: it.id, position: it.position })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder.');
    }
  }
  function moveActive(from: number, to: number) {
    if (to < 0 || to >= active.length || from === to) return;
    const arr = [...active];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    void persistOrder(arr);
  }
  function onDropActive(targetId: string) {
    const from = active.findIndex((i) => i.id === dragId.current);
    const to = active.findIndex((i) => i.id === targetId);
    dragId.current = null;
    setDragOverId(null);
    if (from < 0 || to < 0 || from === to) return;
    moveActive(from, to);
  }

  function renderItem(item: ChecklistItem, activeIdx: number | null) {
    const isActive = activeIdx !== null;
    return (
      <li
        key={item.id}
        className={`check-item${item.done ? ' check-item--done' : ''}${dragOverId === item.id ? ' check-item--dragover' : ''}`}
        onDragOver={isActive ? (e) => { e.preventDefault(); setDragOverId(item.id); } : undefined}
        onDrop={isActive ? () => onDropActive(item.id) : undefined}
      >
        {/* drag handle — desktop only (hidden on touch via CSS); active items only */}
        {isActive ? (
          <span
            className="check-item__handle"
            draggable
            onDragStart={() => (dragId.current = item.id)}
            onDragEnd={() => {
              dragId.current = null;
              setDragOverId(null);
            }}
            aria-hidden="true"
            title="Drag to reorder"
          >
            ⠿
          </span>
        ) : (
          <span className="check-item__handle check-item__handle--spacer" aria-hidden="true" />
        )}

        <button
          type="button"
          className="check-box"
          role="checkbox"
          aria-checked={item.done}
          onClick={() => toggle(item)}
        >
          {item.done && (
            <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {editingId === item.id ? (
          <input
            className="check-item__edit"
            value={editingText}
            autoFocus
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void commitEdit();
              } else if (e.key === 'Escape') {
                setEditingId(null);
              }
            }}
          />
        ) : (
          <span className="check-item__text" onClick={() => startEdit(item)}>
            {item.text}
          </span>
        )}

        {/* up/down reorder — the touch-friendly control (active items only) */}
        {isActive && (
          <span className="check-item__move">
            <button type="button" aria-label="Move up" disabled={activeIdx === 0} onClick={() => moveActive(activeIdx, activeIdx - 1)}>
              ↑
            </button>
            <button type="button" aria-label="Move down" disabled={activeIdx === active.length - 1} onClick={() => moveActive(activeIdx, activeIdx + 1)}>
              ↓
            </button>
          </span>
        )}

        <button type="button" className="check-item__del" aria-label="Delete item" onClick={() => remove(item)}>
          ×
        </button>
      </li>
    );
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

      <ul className="check-list">
        {active.map((item, idx) => renderItem(item, idx))}
        {completed.map((item) => renderItem(item, null))}
      </ul>

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
