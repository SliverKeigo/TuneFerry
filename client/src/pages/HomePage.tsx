import { Link } from 'react-router-dom';
import TokenStatus from '../components/TokenStatus';
import { useMusicKit } from '../hooks/useMusicKit';

export default function HomePage() {
  const { isReady, isAuthorized, authorize, unauthorize, error } = useMusicKit();

  return (
    <div style={{ display: 'grid', gap: 28, maxWidth: 720 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 32 }}>Apple Music Library Organizer</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
          Connect your Apple Music account, search the catalog, inspect your library, and add tracks
          with one click. MVP build — more organizer tools coming.
        </p>
      </header>

      <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {!isAuthorized ? (
          <button type="button" className="btn btn-primary" onClick={authorize} disabled={!isReady}>
            {isReady ? 'Connect Apple Music' : 'Initialising MusicKit…'}
          </button>
        ) : (
          <button type="button" className="btn" onClick={unauthorize}>
            Disconnect
          </button>
        )}
        <Link to="/search" className="btn btn-ghost">
          Go to Search →
        </Link>
        <Link to="/library" className="btn btn-ghost">
          Go to Library →
        </Link>
      </section>

      {error && <div className="error-banner">MusicKit error: {error}</div>}

      <section
        style={{
          padding: 16,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Session</h2>
        <TokenStatus />
      </section>

      <section>
        <h2 style={{ fontSize: 18 }}>What you can do</h2>
        <ul style={{ lineHeight: 1.7, paddingLeft: 18, color: 'var(--color-text-muted)' }}>
          <li>
            Search the Apple Music catalog and add songs / albums / playlists to your library.
          </li>
          <li>Search inside your own library to see what you already have.</li>
          <li>Browse the playlists you already own.</li>
          <li>Use the Organizer page to plan future cleanup actions (more soon).</li>
        </ul>
      </section>
    </div>
  );
}
