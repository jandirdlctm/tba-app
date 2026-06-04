import { supabase } from './supabase';
import type { NewProject, Project, ProjectPatch } from '../types';

// ---------------------------------------------------------------------------
// Data-access layer for the `projects` table.
//
// Everything that touches the database goes through this module. Keeping it in
// one place means that when auth/RLS arrives in a later phase, the changes are
// contained here rather than scattered across components.
// ---------------------------------------------------------------------------

/** Fetch all projects, newest first. */
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Could not load projects: ${error.message}`);
  }

  return (data ?? []) as Project[];
}

/** Fetch a single project by id. Returns null if not found / not permitted. */
export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not load project: ${error.message}`);
  return (data as Project) ?? null;
}

/** Insert a new project and return the created row. (Admin-only via RLS.) */
export async function addProject(project: NewProject): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();

  if (error) {
    throw new Error(`Could not save project: ${error.message}`);
  }

  return data as Project;
}

/** Update editable fields of a project. (Admin-only via RLS.) */
export async function updateProject(id: string, patch: ProjectPatch): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Could not update project: ${error.message}`);
  return data as Project;
}
