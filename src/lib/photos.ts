import { supabase } from './supabase';
import type { Photo } from '../types';

// ---------------------------------------------------------------------------
// photos + image files. Any user ASSIGNED to the project can read/upload;
// enforced by RLS (0007) and the private `project-photos` bucket policy (0008).
// ---------------------------------------------------------------------------

const PHOTOS_BUCKET = 'project-photos';
const SIGNED_URL_TTL = 60 * 60; // 1 hour

/** Photo rows for a project, newest first. */
export async function getPhotos(projectId: string): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Could not load photos: ${error.message}`);
  return (data ?? []) as Photo[];
}

/** Upload an image and create its photo row. Path: "<project_id>/<uuid>.<ext>". */
export async function uploadPhoto(
  projectId: string,
  file: File,
  caption: string | null,
): Promise<Photo> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not signed in.');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${projectId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw new Error(`Could not upload photo: ${upErr.message}`);

  const { data, error } = await supabase
    .from('photos')
    .insert({ project_id: projectId, user_id: auth.user.id, photo_url: path, caption })
    .select()
    .single();

  if (error) {
    // Roll back the orphaned file so storage doesn't accumulate junk.
    await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
    throw new Error(`Could not save photo: ${error.message}`);
  }
  return data as Photo;
}

/** Delete a photo row and its underlying file. */
export async function deletePhoto(photo: Photo): Promise<void> {
  const { error } = await supabase.from('photos').delete().eq('id', photo.id);
  if (error) throw new Error(`Could not delete photo: ${error.message}`);
  // Best-effort file cleanup; the row is already gone.
  await supabase.storage.from(PHOTOS_BUCKET).remove([photo.photo_url]);
}

/** Short-lived signed URL for displaying a stored photo path. */
export async function getPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data.signedUrl;
}
