import { supabase } from './supabase';
import type { ProjectFinancials, ProjectProfitability } from '../types';

// ---------------------------------------------------------------------------
// Job profitability (Phase 3 preview). Admin-only by RLS (0010) on the
// project_financials table and the is_admin() gate inside the RPC.
//
// Postgres `numeric` comes back from PostgREST as strings (to preserve
// precision), so we coerce to numbers here to keep components clean.
// ---------------------------------------------------------------------------

const num = (v: unknown): number => (v == null ? 0 : Number(v));

/** Revenue + labor-rate inputs for one project (or null if not set yet). */
export async function getProjectFinancials(projectId: string): Promise<ProjectFinancials | null> {
  const { data, error } = await supabase
    .from('project_financials')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw new Error(`Could not load financials: ${error.message}`);
  if (!data) return null;
  return {
    project_id: data.project_id,
    contract_value: num(data.contract_value),
    labor_rate: num(data.labor_rate),
    updated_at: data.updated_at,
  };
}

/** Create or update a project's contract value + labor rate. */
export async function upsertProjectFinancials(
  projectId: string,
  fields: { contract_value: number; labor_rate: number },
): Promise<void> {
  const { error } = await supabase.from('project_financials').upsert({
    project_id: projectId,
    contract_value: fields.contract_value,
    labor_rate: fields.labor_rate,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Could not save financials: ${error.message}`);
}

/** Per-project profitability rollup across all projects (admin only). */
export async function getProfitability(): Promise<ProjectProfitability[]> {
  const { data, error } = await supabase.rpc('project_profitability');
  if (error) throw new Error(`Could not load profitability: ${error.message}`);

  return (data ?? []).map(
    (r: Record<string, unknown>): ProjectProfitability => ({
      project_id: r.project_id as string,
      project_name: r.project_name as string,
      status: r.status as ProjectProfitability['status'],
      contract_value: num(r.contract_value),
      materials_cost: num(r.materials_cost),
      labor_hours: num(r.labor_hours),
      labor_rate: num(r.labor_rate),
      labor_cost: num(r.labor_cost),
      profit: num(r.profit),
    }),
  );
}
