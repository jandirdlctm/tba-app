import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Per-worker hourly cost rates. Admin-only by RLS (0011). Feeds the profit math
// (each worker's hours × their rate). Workers can't read this table at all.
// ---------------------------------------------------------------------------

const num = (v: unknown): number => (v == null ? 0 : Number(v));

/** Map of user_id -> hourly rate. Workers without a row simply aren't present. */
export async function getWorkerRates(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('worker_rates').select('user_id, hourly_rate');
  if (error) throw new Error(`Could not load worker rates: ${error.message}`);

  const map: Record<string, number> = {};
  for (const r of data ?? []) map[r.user_id as string] = num(r.hourly_rate);
  return map;
}

/** Set a worker's hourly cost rate. */
export async function upsertWorkerRate(userId: string, hourlyRate: number): Promise<void> {
  const { error } = await supabase.from('worker_rates').upsert({
    user_id: userId,
    hourly_rate: hourlyRate,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Could not save rate: ${error.message}`);
}
