import { supabase } from './supabase';
import type { Material, NewMaterial } from '../types';

// ---------------------------------------------------------------------------
// materials + receipt images. Admin-only access is enforced by RLS (0005) and
// the private `receipts` storage bucket policy (0008).
// ---------------------------------------------------------------------------

const RECEIPTS_BUCKET = 'receipts';
const SIGNED_URL_TTL = 60 * 60; // 1 hour

/** All material line items for a project, newest first. */
export async function getMaterials(projectId: string): Promise<Material[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Could not load materials: ${error.message}`);
  return (data ?? []) as Material[];
}

export async function addMaterial(material: NewMaterial): Promise<Material> {
  const { data, error } = await supabase.from('materials').insert(material).select().single();
  if (error) throw new Error(`Could not add material: ${error.message}`);
  return data as Material;
}

export async function updateMaterial(
  id: string,
  patch: Partial<NewMaterial>,
): Promise<Material> {
  const { data, error } = await supabase
    .from('materials')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Could not update material: ${error.message}`);
  return data as Material;
}

export async function deleteMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) throw new Error(`Could not delete material: ${error.message}`);
}

/**
 * Upload a receipt image to the private bucket and return its storage PATH
 * (store this in materials.receipt_url). Path is "<project_id>/<uuid>.<ext>".
 */
export async function uploadReceipt(projectId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${projectId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Could not upload receipt: ${error.message}`);
  return path;
}

/** Turn a stored receipt path into a short-lived signed URL for display. */
export async function getReceiptUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data.signedUrl;
}
