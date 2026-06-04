import { supabase } from './supabase';
import type { ProjectAssignment } from '../types';

// ---------------------------------------------------------------------------
// project_assignments data access. Admin-only writes are enforced by RLS.
// ---------------------------------------------------------------------------

/** Assignments for a project, with each worker's name/role joined in. */
export async function getAssignments(projectId: string): Promise<ProjectAssignment[]> {
  const { data, error } = await supabase
    .from('project_assignments')
    .select('id, project_id, user_id, created_at, profile:profiles(full_name, role)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Could not load assignments: ${error.message}`);
  // Supabase types the embedded relation loosely; normalize to our shape.
  return (data ?? []) as unknown as ProjectAssignment[];
}

/** Assign a worker to a project. */
export async function assignWorker(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('project_assignments')
    .insert({ project_id: projectId, user_id: userId });
  if (error) throw new Error(`Could not assign worker: ${error.message}`);
}

/** Remove a worker from a project. */
export async function unassignWorker(assignmentId: string): Promise<void> {
  const { error } = await supabase.from('project_assignments').delete().eq('id', assignmentId);
  if (error) throw new Error(`Could not unassign worker: ${error.message}`);
}
