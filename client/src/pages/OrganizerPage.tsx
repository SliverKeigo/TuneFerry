import type { ReactNode } from 'react';
import * as Icon from '../components/icons';
import { Button, PageHeader, Pill, SectionHeader } from '../components/primitives';

type ActionStatus = 'planned' | 'soon';

interface OrganizerAction {
  id: string;
  icon: ReactNode;
  title: string;
  desc: string;
  status: ActionStatus;
}

const ACTIONS: OrganizerAction[] = [
  {
    id: 'by-artist',
    icon: <Icon.User size={18} />,
    title: 'Group library by artist',
    desc: 'Bucket every song and album by artist — spot duplicates, spelling drift, and missing releases.',
    status: 'planned',
  },
  {
    id: 'by-album',
    icon: <Icon.Disc size={18} />,
    title: 'Group by album',
    desc: 'See which albums are complete vs. which only have a handful of tracks.',
    status: 'planned',
  },
  {
    id: 'missing-songs',
    icon: <Icon.Search size={18} />,
    title: 'Find missing songs',
    desc: 'Compare what you own against the catalog tracklist and surface the gaps per album.',
    status: 'planned',
  },
  {
    id: 'bulk-playlist',
    icon: <Icon.List size={18} />,
    title: 'Bulk add to playlist',
    desc: 'Select songs from anywhere in the app and push them into an existing playlist.',
    status: 'soon',
  },
  {
    id: 'smart-mix',
    icon: <Icon.Sparkle size={18} />,
    title: 'Smart mix suggestions',
    desc: 'Fresh playlist ideas from your listening patterns and library structure.',
    status: 'soon',
  },
];

export default function OrganizerPage() {
  return (
    <div
      className="page-enter"
      style={{ padding: '32px 48px 80px', maxWidth: 1280, margin: '0 auto' }}
    >
      <PageHeader
        eyebrow="Organizer"
        title="Tidy your library"
        desc="Bulk operations and insights. More arriving soon — this page is a scaffold."
        right={<Pill tone="accent">Preview</Pill>}
      />

      {/* Action cards grid */}
      <section style={{ marginBottom: 36 }}>
        <SectionHeader
          title="Planned actions"
          desc="Everything below is wire-framed. Buttons are intentionally disabled until the backend is ready."
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {ACTIONS.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section>
        <SectionHeader title="How the Organizer works" />
        <div className="panel" style={{ padding: 20 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: 'var(--text-2)',
              lineHeight: 1.6,
            }}
          >
            The Organizer combines three read-only endpoints today to build insights without
            changing anything in your library until you confirm.
          </p>
          <ul
            style={{
              margin: '16px 0 0',
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <HowItem
              code="/library/search"
              desc="Walks your current library (songs, albums, playlists, artists) to build the ground-truth inventory."
            />
            <HowItem
              code="/catalog/search"
              desc="Looks up the same titles in the storefront catalog to detect mismatches and find candidate fills."
            />
            <HowItem
              code="/me/library/playlists"
              desc="Enumerates playlists to suggest merges, bulk adds, and archive candidates."
            />
          </ul>
        </div>
      </section>
    </div>
  );
}

function ActionCard({ action }: { action: OrganizerAction }) {
  const statusTone = action.status === 'planned' ? 'neutral' : 'accent';
  const statusLabel = action.status === 'planned' ? 'Planned' : 'Soon';

  return (
    <article
      className="panel"
      style={{
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 170,
        opacity: 0.92,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--elev)',
            border: '1px solid var(--hairline)',
            color: 'var(--text-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {action.icon}
        </div>
        <Pill tone={statusTone}>{statusLabel}</Pill>
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: -0.1,
          marginTop: 4,
        }}
      >
        {action.title}
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: 'var(--text-3)',
          lineHeight: 1.5,
          flex: 1,
        }}
      >
        {action.desc}
      </div>
      <div style={{ marginTop: 4 }}>
        <Button
          variant="ghost"
          size="sm"
          disabled
          style={{ cursor: 'not-allowed', opacity: 0.7 }}
          iconRight={<Icon.Chevron size={12} />}
        >
          Not yet
        </Button>
      </div>
    </article>
  );
}

function HowItem({ code, desc }: { code: string; desc: string }) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        fontSize: 13,
        color: 'var(--text-2)',
        lineHeight: 1.5,
      }}
    >
      <code
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11.5,
          padding: '3px 8px',
          borderRadius: 6,
          background: 'var(--elev)',
          border: '1px solid var(--hairline)',
          color: 'var(--text)',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {code}
      </code>
      <span>{desc}</span>
    </li>
  );
}
