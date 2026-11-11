-- UX-12: private, server-readable PDF copy for an authenticated meeting-document reader.
-- Content is only imported through an explicitly audited administrator operation.
-- This is NOT a public download table, client upload API or official ratification.

create table if not exists public.meeting_document_pdf_chunks (
  document_id uuid not null references public.meeting_documents(id) on delete cascade,
  part integer not null check (part between 0 and 511),
  content_base64 text not null check (
    octet_length(content_base64) between 4 and 65536
    and content_base64 ~ '^[A-Za-z0-9+/]+={0,2}$'
    and length(content_base64) % 4 = 0
  ),
  primary key (document_id, part)
);

create table if not exists public.meeting_document_pdf_assets (
  document_id uuid primary key references public.meeting_documents(id) on delete cascade,
  byte_size integer not null check (byte_size between 5 and 41943040),
  part_count integer not null check (part_count between 1 and 512),
  sha256_hex text not null check (sha256_hex ~ '^[a-f0-9]{64}$'),
  verified_at timestamptz not null default now()
);

alter table public.meeting_document_pdf_chunks enable row level security;
alter table public.meeting_document_pdf_assets enable row level security;

-- Deny ordinary browser/API roles. There are deliberately no anon/authenticated RLS policies.
revoke all on public.meeting_document_pdf_chunks from public, anon, authenticated;
revoke all on public.meeting_document_pdf_assets from public, anon, authenticated;
grant select on public.meeting_document_pdf_chunks to service_role;
grant select on public.meeting_document_pdf_assets to service_role;

comment on table public.meeting_document_pdf_chunks is
  'Private backend copy of selected authenticated-meeting PDF; not available to browser roles';
comment on table public.meeting_document_pdf_assets is
  'Private PDF copy verification metadata; document authorization is enforced separately through meeting_documents RLS before any server read';
