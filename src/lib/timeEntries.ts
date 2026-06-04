import { supabase } from './supabase';
import type { NewTimeEntry, TimeEntry } from '../types';

// ---------------------------------------------------------------------------
// time_entries. RLS (0006) means getMyEntries returns only the caller's rows,
// while getProjectEntries returns everyone's ONLY for admins (a worker calling
// it still gets just their own — RLS filters server-side).
// ---------------------------------------------------------------------------

/** The signed-in user's own entries for a project (worker view). */
export async function getMyEntries(projectId: string): Promise<TimeEntry[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', auth.user.id)
    .order('work_date', { ascending: false });

  if (error) throw new Error(`Could not load hours: ${error.message}`);
  return (data ?? []) as TimeEntry[];
}

/** All entries for a project, with worker names (admin rollup view). */
export async function getProjectEntries(projectId: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, profile:profiles(full_name)')
    .eq('project_id', projectId)
    .order('work_date', { ascending: false });

  if (error) throw new Error(`Could not load hours: ${error.message}`);
  return (data ?? []) as unknown as TimeEntry[];
}

/** Add hours. user_id is set to the caller; RLS requires assignment. */
export async function addTimeEntry(entry: NewTimeEntry): Promise<TimeEntry> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('time_entries')
    .insert({ ...entry, user_id: auth.user.id })
    .select()
    .single();

  if (error) throw new Error(`Could not save hours: ${error.message}`);
  return data as TimeEntry;
}

export async function updateTimeEntry(
  id: string,
  patch: Partial<Pick<TimeEntry, 'work_date' | 'hours' | 'note'>>,
): Promise<TimeEntry> {
  const { data, error } = await supabase
    .from('time_entries')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Could not update hours: ${error.message}`);
  return data as TimeEntry;
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) throw new Error(`Could not delete hours: ${error.message}`);
}
