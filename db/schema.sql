-- One generic card table; kind is the deck ('dsa', 'os', 'oop', 'sql50', ...). The allowed decks live in
-- src/lib/types.ts, not in the database, so adding a deck needs no migration.
-- DSA extras (link, notes, reference code, ...) live in meta jsonb; flashcards use prompt/answer only.
create table if not exists cards (
  id         serial primary key,
  kind       text not null,
  key        text not null unique,           -- stable id, e.g. 'dsa:row-2'
  title      text not null,
  prompt     text not null default '',       -- statement (html) or flashcard question
  answer     text,                           -- flashcard answer (null for dsa)
  tags       text[] not null default '{}',
  difficulty text,                           -- Easy | Medium | Hard | null
  category   text not null default 'unclassified'
             check (category in ('green','yellow','red','gold','unclassified')),
  revised    boolean not null default false,
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists cards_kind_idx on cards (kind);

create table if not exists attempts (
  id      serial primary key,
  card_id integer not null references cards(id) on delete cascade,
  outcome text not null check (outcome in ('solved','hint','failed')),
  at      timestamptz not null default now()
);
create index if not exists attempts_card_idx on attempts (card_id);

-- Older databases had a hardcoded deck list here; drop it.
alter table cards drop constraint if exists cards_kind_check;
