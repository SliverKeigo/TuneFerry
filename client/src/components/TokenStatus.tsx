import { useMusicKit } from '../hooks/useMusicKit';

export default function TokenStatus() {
  const { isReady, isAuthorized, musicUserToken, storefront, error } = useMusicKit();

  return (
    <div style={{ display: 'grid', gap: 6, fontSize: 14 }}>
      <div>
        <strong>MusicKit:</strong>{' '}
        {error ? (
          <span style={{ color: 'var(--color-error)' }}>error — {error}</span>
        ) : isReady ? (
          'ready'
        ) : (
          'loading…'
        )}
      </div>
      <div>
        <strong>Storefront:</strong> {storefront}
      </div>
      <div>
        <strong>Authorized:</strong> {isAuthorized ? 'yes' : 'no'}
      </div>
      <div>
        <strong>Music User Token:</strong>{' '}
        {musicUserToken ? (
          <code style={{ wordBreak: 'break-all' }}>{musicUserToken.slice(0, 24)}…</code>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>none</span>
        )}
      </div>
    </div>
  );
}
