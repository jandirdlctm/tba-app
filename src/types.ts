// Shared domain types for the whole app.

/** The three statuses a project can be in. Single source of truth. */
export type ProjectStatus = 'active' | 'upcoming' | 'completed';

/** Work types offered in the Add form's dropdown. */
export const WORK_TYPES = [
  'Landscaping',
  'Paper job',
  'Concrete / flatwork',
  'Hardscape',
  'Other',
] as const;

export type WorkType = (typeof WORK_TYPES)[number];

/**
 * Job stage — the physical workflow of a job. Phase 2 addition. Deliberately
 * SEPARATE from `status` (active/upcoming/completed): a job can be `active`
 * while in the `build` stage.
 */
export type JobStage = 'demo_prep' | 'build' | 'finish';

/** Ordered stage steps for the 3-step tracker. */
export const JOB_STAGES: { key: JobStage; label: string }[] = [
  { key: 'demo_prep', label: 'Demo / Prep' },
  { key: 'build', label: 'Build' },
  { key: 'finish', label: 'Finish' },
];

/** A project row exactly as stored in / returned from Supabase. */
export interface Project {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  work_type: string | null;
  status: ProjectStatus;
  stage: JobStage; // Phase 2
  scope_note: string | null;
  start_date: string | null; // ISO date (YYYY-MM-DD)
  end_date: string | null; // ISO date (YYYY-MM-DD)
  created_at: string; // ISO timestamp
}

/** Fields an admin can edit inline on the detail page. */
export type ProjectPatch = Partial<
  Pick<
    Project,
    'name' | 'address' | 'work_type' | 'status' | 'stage' | 'scope_note' | 'start_date' | 'end_date'
  >
>;

/** The fields the user supplies when adding a project (id/created_at are DB-set). */
export interface NewProject {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  work_type: string | null;
  status: ProjectStatus;
  scope_note: string | null;
  start_date: string | null;
  end_date: string | null;
}

/** The filter selection on the map. 'all' is the default chip. */
export type StatusFilter = 'all' | ProjectStatus;

/** Display metadata for each status — colors match the spec exactly. */
export const STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#1D9E75' },
  upcoming: { label: 'Upcoming', color: '#EF9F27' },
  completed: { label: 'Completed', color: '#888780' },
};

// ===========================================================================
// Phase 2 records — auth, assignments, materials, time, photos.
// One shared type per table, mirroring the Phase 1 Project type above.
// ===========================================================================

/** User role. admin = owner/PM (everything); worker = sub (assigned only). */
export type Role = 'admin' | 'worker';

/** A row in `profiles`, linked 1:1 to an auth user. */
export interface Profile {
  id: string; // = auth.users.id
  full_name: string;
  role: Role;
  created_at: string;
}

/** A row in `project_assignments`. `profile` is joined in for display. */
export interface ProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
  profile?: Pick<Profile, 'full_name' | 'role'> | null;
}

/** Where a material line sits in the purchasing flow. */
export type MaterialStatus = 'needed' | 'ordered' | 'received';

export const MATERIAL_STATUSES: { key: MaterialStatus; label: string }[] = [
  { key: 'needed', label: 'Needed' },
  { key: 'ordered', label: 'Ordered' },
  { key: 'received', label: 'Received' },
];

/** A row in `materials`. `total_cost` is a DB-generated column. */
export interface Material {
  id: string;
  project_id: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  status: MaterialStatus;
  note: string | null;
  receipt_url: string | null; // storage path in the private `receipts` bucket
  total_cost: number; // generated: quantity * unit_cost
  created_at: string;
}

/** User-supplied material fields (id/total/created_at are DB-set). */
export interface NewMaterial {
  project_id: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  status: MaterialStatus;
  note: string | null;
  receipt_url: string | null;
}

/** A row in `time_entries`. `profile` is joined in for admin rollups. */
export interface TimeEntry {
  id: string;
  project_id: string;
  user_id: string;
  work_date: string; // ISO date (YYYY-MM-DD)
  hours: number;
  note: string | null;
  created_at: string;
  profile?: Pick<Profile, 'full_name'> | null;
}

/** User-supplied time-entry fields. */
export interface NewTimeEntry {
  project_id: string;
  work_date: string;
  hours: number;
  note: string | null;
}

/** A single checkable item in a project's scope checklist. */
export interface ChecklistItem {
  id: string;
  project_id: string;
  text: string;
  done: boolean;
  position: number; // manual sort order
  created_at: string;
}

/** Done/total counts for a project's checklist (for the map popup). */
export interface ChecklistProgress {
  done: number;
  total: number;
}

/** A row in `photos`. `photo_url` is a storage path, rendered via signed URL. */
export interface Photo {
  id: string;
  project_id: string;
  user_id: string;
  photo_url: string; // storage path in the private `project-photos` bucket
  caption: string | null;
  created_at: string;
}

// --- Phase 3 (preview): job profitability ----------------------------------

/** Admin-only revenue + labor-rate inputs for a project (own table). */
export interface ProjectFinancials {
  project_id: string;
  contract_value: number; // revenue / sell price
  labor_rate: number; // company labor cost per hour
  updated_at: string;
}

/** A worker's hourly COST rate (admin-only; never visible to the worker). */
export interface WorkerRate {
  user_id: string;
  hourly_rate: number;
  updated_at: string;
}

/** A computed profitability row (from the project_profitability() RPC). */
export interface ProjectProfitability {
  project_id: string;
  project_name: string;
  status: ProjectStatus;
  contract_value: number;
  materials_cost: number;
  labor_hours: number;
  labor_rate: number;
  labor_cost: number;
  profit: number;
}
