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

// Apple-Notes-style scope checklist. Any assigned user can add, check, edit,
// reorder, and delete. Interactions are optimistic so they feel instant.
export default function ChecklistSection({ projectId }: ChecklistSectionProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newText, setNewText] = useState('');

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Drag reorder (pointer devices)
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
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
      // Emptying an item deletes it (Apple-Notes behavior).
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

  // --- reordering ---
  async function persistOrder(next: ChecklistItem[]) {
    setItems(next);
    try {
      await reorderChecklist(next.map((it, idx) => ({ id: it.id, position: idx })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder.');
    }
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void persistOrder(next);
  }
  function onDrop(to: number) {
    const from = dragFrom.current;
    dragFrom.current = null;
    setDragOver(null);
    if (from === null || from === to) return;
    move(from, to);
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
        {items.map((item, i) => (
          <li
            key={item.id}
            className={`check-item${item.done ? ' check-item--done' : ''}${dragOver === i ? ' check-item--dragover' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(i);
            }}
            onDrop={() => onDrop(i)}
          >
            {/* drag handle (pointer) */}
            <span
              className="check-item__handle"
              draggable
              onDragStart={() => (dragFrom.current = i)}
              onDragEnd={() => {
                dragFrom.current = null;
                setDragOver(null);
              }}
              aria-hidden="true"
              title="Drag to reorder"
            >
              ⠿
            </span>

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

            {/* up/down reorder — the touch-friendly fallback for drag */}
            <span className="check-item__move">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                ↑
              </button>
              <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
                ↓
              </button>
            </span>

            <button type="button" className="check-item__del" aria-label="Delete item" onClick={() => remove(item)}>
              ×
            </button>
          </li>
        ))}
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
