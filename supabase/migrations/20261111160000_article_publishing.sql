create extension if not exists pgcrypto;

create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  source_filename text not null,
  row_count integer not null check (row_count > 0),
  column_names jsonb not null check (jsonb_typeof(column_names) = 'array'),
  records jsonb not null check (jsonb_typeof(records) = 'array'),
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets(id) on delete restrict,
  slug text not null unique,
  seo_title text not null,
  meta_description text not null,
  eyebrow text not null,
  title text not null,
  intro text not null,
  conclusion text not null,
  takeaways jsonb not null check (jsonb_typeof(takeaways) = 'array'),
  ranking_title text not null,
  ranking_description text not null,
  accent text not null check (accent in ('coral', 'sage', 'sand', 'ink')),
  entity_column text not null,
  ranking_metric text not null,
  ranking_direction text not null check (ranking_direction in ('asc', 'desc')),
  selected_statistics jsonb not null check (jsonb_typeof(selected_statistics) = 'array'),
  statistics jsonb not null check (jsonb_typeof(statistics) = 'array'),
  methodology text not null,
  published_at timestamptz not null,
  reading_minutes integer not null check (reading_minutes > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.article_sections (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  position integer not null check (position >= 0),
  heading text not null,
  paragraphs jsonb not null check (jsonb_typeof(paragraphs) = 'array'),
  unique (article_id, position)
);

create index if not exists articles_dataset_id_idx on public.articles(dataset_id);
create index if not exists articles_published_at_idx on public.articles(published_at desc);
create index if not exists article_sections_article_id_idx on public.article_sections(article_id, position);

alter table public.datasets enable row level security;
alter table public.articles enable row level security;
alter table public.article_sections enable row level security;

create or replace function public.publish_article(p_dataset jsonb, p_article jsonb, p_sections jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_dataset_id uuid;
  new_article_id uuid;
  section jsonb;
  section_position integer := 0;
begin
  if jsonb_typeof(p_dataset->'records') <> 'array'
    or jsonb_array_length(p_dataset->'records') <> (p_dataset->>'row_count')::integer
    or jsonb_typeof(p_sections) <> 'array' then
    raise exception 'Invalid publish payload';
  end if;

  insert into public.datasets (source_filename, row_count, column_names, records)
  values (p_dataset->>'source_filename', (p_dataset->>'row_count')::integer, p_dataset->'column_names', p_dataset->'records')
  returning id into new_dataset_id;

  insert into public.articles (
    dataset_id, slug, seo_title, meta_description, eyebrow, title, intro, conclusion,
    takeaways, ranking_title, ranking_description, accent, entity_column, ranking_metric,
    ranking_direction, selected_statistics, statistics, methodology, published_at, reading_minutes
  ) values (
    new_dataset_id, p_article->>'slug', p_article->>'seo_title', p_article->>'meta_description',
    p_article->>'eyebrow', p_article->>'title', p_article->>'intro', p_article->>'conclusion',
    p_article->'takeaways', p_article->>'ranking_title', p_article->>'ranking_description',
    p_article->>'accent', p_article->>'entity_column', p_article->>'ranking_metric',
    p_article->>'ranking_direction', p_article->'selected_statistics', p_article->'statistics',
    p_article->>'methodology', (p_article->>'published_at')::timestamptz,
    (p_article->>'reading_minutes')::integer
  ) returning id into new_article_id;

  for section in select value from jsonb_array_elements(p_sections)
  loop
    insert into public.article_sections (article_id, position, heading, paragraphs)
    values (new_article_id, section_position, section->>'heading', section->'paragraphs');
    section_position := section_position + 1;
  end loop;

  return jsonb_build_object('dataset_id', new_dataset_id, 'article_id', new_article_id, 'slug', p_article->>'slug');
end;
$$;

revoke all on function public.publish_article(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.publish_article(jsonb, jsonb, jsonb) to service_role;
