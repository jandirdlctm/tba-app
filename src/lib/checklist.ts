import { supabase } from './supabase';
import type { ChecklistItem, ChecklistProgress } from '../types';

// ---------------------------------------------------------------------------
// Scope checklist data access. Any user assigned to the project can read/write
// (enforced by RLS in 0012).
// ---------------------------------------------------------------------------

/** Items for a project, in manual sort order. */
export async function getChecklistItems(projectId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Could not load checklist: ${error.message}`);
  return (data ?? []) as ChecklistItem[];
}

export async function addChecklistItem(
  projectId: string,
  text: string,
  position: number,
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from('checklist_items')
    .insert({ project_id: projectId, text, position })
    .select()
    .single();

  if (error) throw new Error(`Could not add item: ${error.message}`);
  return data as ChecklistItem;
}

export async function updateChecklistItem(
  id: string,
  patch: Partial<Pick<ChecklistItem, 'text' | 'done' | 'position'>>,
): Promise<void> {
  const { error } = await supabase.from('checklist_items').update(patch).eq('id', id);
  if (error) throw new Error(`Could not update item: ${error.message}`);
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabase.from('checklist_items').delete().eq('id', id);
  if (error) throw new Error(`Could not delete item: ${error.message}`);
}

/** Persist a new order by writing each item's position. */
export async function reorderChecklist(order: { id: string; position: number }[]): Promise<void> {
  const results = await Promise.all(
    order.map((o) =>
      supabase.from('checklist_items').update({ position: o.position }).eq('id', o.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`Could not reorder: ${failed.error.message}`);
}

/**
 * Per-project checklist progress for the map popup. RLS scopes this to the
 * projects the caller can see, so we can aggregate everything in one query.
 */
export async function getChecklistProgress(): Promise<Record<string, ChecklistProgress>> {
  const { data, error } = await supabase.from('checklist_items').select('project_id, done');
  if (error) throw new Error(`Could not load checklist progress: ${error.message}`);

  const map: Record<string, ChecklistProgress> = {};
  for (const row of (data ?? []) as { project_id: string; done: boolean }[]) {
    const p = (map[row.project_id] ??= { done: 0, total: 0 });
    p.total += 1;
    if (row.done) p.done += 1;
  }
  return map;
}
