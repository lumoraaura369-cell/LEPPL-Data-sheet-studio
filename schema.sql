create sequence if not exists sheet_no_seq;
create table if not exists sheets(id bigserial primary key,no text not null,rev int not null default 0,tid text not null,
 status text not null default 'Draft' check (status in ('Draft','Review','Approved','Superseded')),
 meta jsonb not null default '{}',vals jsonb not null default '{}',created timestamptz not null default now(),updated timestamptz not null default now(),unique(no,rev));
create table if not exists audit(id bigserial primary key,t timestamptz not null default now(),a text,ref text,who text);
create table if not exists custom_templates(id text primary key,data jsonb not null,created timestamptz not null default now());
alter table sheets enable row level security;alter table audit enable row level security;alter table custom_templates enable row level security;
create or replace function next_sheet_no() returns text language sql as $$ select 'DS-'||lpad(nextval('sheet_no_seq')::text,6,'0') $$;
create or replace function revise_sheet(p_id bigint,p_meta jsonb,p_values jsonb) returns sheets language plpgsql as $$
declare o sheets; n sheets;
begin select * into o from sheets where id=p_id for update;
 if o.status<>'Approved' then raise exception 'Only an Approved sheet can be revised'; end if;
 update sheets set status='Superseded',updated=now() where id=p_id;
 insert into sheets(no,rev,tid,status,meta,vals) values(o.no,o.rev+1,o.tid,'Draft',coalesce(p_meta,o.meta),coalesce(p_values,o.vals)) returning * into n;
 return n; end $$;
revoke execute on function next_sheet_no(),revise_sheet(bigint,jsonb,jsonb) from public,anon,authenticated;
