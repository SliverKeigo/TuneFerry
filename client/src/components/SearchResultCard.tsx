import { ReactNode } from 'react';
import type {
  AppleMusicAlbumAttributes,
  AppleMusicArtistAttributes,
  AppleMusicArtwork,
  AppleMusicPlaylistAttributes,
  AppleMusicResource,
  AppleMusicSongAttributes,
} from '../types/appleMusic';
import styles from './SearchResultCard.module.css';

interface Props {
  resource: AppleMusicResource;
  actions?: ReactNode;
}

function artworkUrl(artwork: AppleMusicArtwork | undefined, size = 120): string | undefined {
  if (!artwork?.url) return undefined;
  return artwork.url.replace('{w}', String(size)).replace('{h}', String(size));
}

function formatDuration(ms: number | undefined): string | null {
  if (!ms || !Number.isFinite(ms)) return null;
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function humaniseType(type: string): string {
  // library-songs -> Library song, playlists -> Playlist
  return type
    .replace(/^library-/, 'library ')
    .replace(/s$/, '')
    .replace(/-/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

export default function SearchResultCard({ resource, actions }: Props) {
  const { type, attributes } = resource;

  let title = '(unknown)';
  let subtitle = '';
  let art: AppleMusicArtwork | undefined;
  const metaChips: string[] = [humaniseType(type)];

  // Narrow the attribute bag based on type.
  if (type === 'songs' || type === 'library-songs') {
    const attrs = attributes as AppleMusicSongAttributes | undefined;
    title = attrs?.name ?? title;
    subtitle = [attrs?.artistName, attrs?.albumName].filter(Boolean).join(' · ');
    art = attrs?.artwork;
    const dur = formatDuration(attrs?.durationInMillis);
    if (dur) metaChips.push(dur);
  } else if (type === 'albums' || type === 'library-albums') {
    const attrs = attributes as AppleMusicAlbumAttributes | undefined;
    title = attrs?.name ?? title;
    subtitle = [attrs?.artistName, attrs?.releaseDate?.slice(0, 4)].filter(Boolean).join(' · ');
    art = attrs?.artwork;
    if (attrs?.trackCount) metaChips.push(`${attrs.trackCount} tracks`);
  } else if (type === 'artists' || type === 'library-artists') {
    const attrs = attributes as AppleMusicArtistAttributes | undefined;
    title = attrs?.name ?? title;
    subtitle = attrs?.genreNames?.join(', ') ?? '';
    art = attrs?.artwork;
  } else if (type === 'playlists' || type === 'library-playlists') {
    const attrs = attributes as AppleMusicPlaylistAttributes | undefined;
    title = attrs?.name ?? title;
    subtitle = attrs?.curatorName ?? attrs?.description?.short ?? '';
    art = attrs?.artwork;
  } else {
    // Best-effort fallback: try to show `name` if present.
    const attrs = attributes as { name?: string; artistName?: string } | undefined;
    title = attrs?.name ?? title;
    subtitle = attrs?.artistName ?? '';
  }

  const imgSrc = artworkUrl(art);

  return (
    <article className={styles.card}>
      <div className={styles.art}>
        {imgSrc ? <img src={imgSrc} alt="" loading="lazy" /> : null}
      </div>
      <div className={styles.body}>
        <div className={styles.title} title={title}>
          {title}
        </div>
        {subtitle ? (
          <div className={styles.subtitle} title={subtitle}>
            {subtitle}
          </div>
        ) : null}
        <div className={styles.meta}>
          {metaChips.map((chip) => (
            <span key={chip} className="tag">
              {chip}
            </span>
          ))}
          <span className="tag" title={`Apple ID: ${resource.id}`}>
            id: {resource.id}
          </span>
        </div>
      </div>
      <div className={styles.actions}>{actions}</div>
    </article>
  );
}
