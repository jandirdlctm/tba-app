import { useEffect, useState } from 'react';
import { getPhotos, uploadPhoto, deletePhoto, getPhotoUrl } from '../lib/photos';
import { useAuth } from '../context/AuthProvider';
import type { Photo } from '../types';

interface PhotosSectionProps {
  projectId: string;
}

// Photo grid for a project. Any assigned user (worker or admin) can upload/view.
export default function PhotosSection({ projectId }: PhotosSectionProps) {
  const { profile, isAdmin } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setPhotos(await getPhotos(projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load photos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadPhoto(projectId, file, caption.trim() || null);
      setCaption('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photo: Photo) {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await deletePhoto(photo);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete photo.');
    }
  }

  return (
    <div className="detail-stack">
      {error && <div className="banner banner--error">{error}</div>}

      <section className="card">
        <h3 className="card__title">Add a photo</h3>
        <label className="field">
          <span className="field__label">Caption (optional)</span>
          <input className="field__input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What's in the photo?" />
        </label>
        <label className="field">
          <span className="field__label">Photo</span>
          <input
            className="field__input"
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {uploading && <p className="muted-note">Uploading…</p>}
      </section>

      <section className="card">
        <h3 className="card__title">Photos</h3>
        {loading ? (
          <p className="muted-note">Loading photos…</p>
        ) : photos.length === 0 ? (
          <p className="muted-note">No photos yet.</p>
        ) : (
          <div className="gallery">
            {photos.map((p) => (
              <PhotoTile
                key={p.id}
                photo={p}
                canDelete={isAdmin || p.user_id === profile?.id}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Resolves each photo's storage path to a signed URL for display.
function PhotoTile({
  photo,
  canDelete,
  onDelete,
}: {
  photo: Photo;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getPhotoUrl(photo.photo_url).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [photo.photo_url]);

  return (
    <figure className="tile">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img className="tile__img" src={url} alt={photo.caption ?? 'Project photo'} loading="lazy" />
        </a>
      ) : (
        <div className="tile__img tile__img--placeholder" />
      )}
      {photo.caption && <figcaption className="tile__cap">{photo.caption}</figcaption>}
      {canDelete && (
        <button type="button" className="tile__del" aria-label="Delete photo" onClick={onDelete}>
          ×
        </button>
      )}
    </figure>
  );
}
