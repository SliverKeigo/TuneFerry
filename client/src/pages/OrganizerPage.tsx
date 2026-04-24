import { Link } from 'react-router-dom';

interface OrganizerAction {
  id: string;
  title: string;
  body: string;
  status: 'planned' | 'coming-soon';
}

const ACTIONS: OrganizerAction[] = [
  {
    id: 'by-artist',
    title: 'Group library by artist',
    body: 'Bucket every song and album in your library by artist. Spot duplicates, mixed spellings, and missing albums.',
    status: 'planned',
  },
  {
    id: 'by-album',
    title: 'Group by album',
    body: 'See which albums are complete vs. which only have a handful of tracks. Useful before a purge or a re-download.',
    status: 'planned',
  },
  {
    id: 'missing-songs',
    title: 'Find missing songs',
    body: 'For a chosen album, compare your library against the catalog tracklist and surface the gaps.',
    status: 'planned',
  },
  {
    id: 'bulk-playlist',
    title: 'Bulk add to playlist',
    body: 'Select a handful of songs from anywhere in the app and push them into an existing playlist.',
    status: 'coming-soon',
  },
];

export default function OrganizerPage() {
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 820 }}>
      <header>
        <h1 style={{ margin: 0 }}>Organizer</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 6 }}>
          The organizer builds on the data we already have via{' '}
          <Link to="/library">Library</Link> and <Link to="/search">Search</Link>. These are the
          operations we&apos;re targeting next.
        </p>
      </header>

      <section
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        }}
      >
        {ACTIONS.map((a) => (
          <article
            key={a.id}
            style={{
              padding: 16,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              display: 'grid',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{a.title}</h3>
              <span className="tag">{a.status === 'planned' ? 'Planned' : 'Soon'}</span>
            </div>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.5 }}>
              {a.body}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
