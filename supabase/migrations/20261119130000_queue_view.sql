-- #12 BR4 queue level per store: the view `store_queue_status` (Implementation Plan BR4).
-- Mirrored in client/src/utils/queueDecay.js so the maths is unit-tested in Jest too.
--
--   score:  none = 0, short = 1, moderate = 2, long = 3
--   weight: 0.8 up to 15 min old, then falls in a straight line to 0 at 120 min
--   level:  round( Σ(weight × score) / Σ(weight) ) over the store's Queue reports from the last 120 min
--           → none / short / moderate / long, or 'unknown' when there are no recent reports
--
-- Every store gets a row, so S1, S3 and S4 can show 'unknown' without special cases.
--
-- Access: report_logs RLS only lets users read their own rows, so this view runs with its
-- owner's rights (security_invoker = false) to count everyone's reports. It only exposes
-- per-store totals: no user ids, no individual reports.

create or replace view public.store_queue_status
with (security_invoker = false) as
with recent as (
  select
    r.store_id,
    r.created_at,
    case r.submitted_value
      when 'none' then 0 when 'short' then 1 when 'moderate' then 2 when 'long' then 3
    end as score,
    extract(epoch from (now() - r.created_at)) / 60.0 as age_min
  from public.report_logs r
  where r.report_type = 'Queue'
    and r.submitted_value in ('none', 'short', 'moderate', 'long')
    and r.created_at > now() - interval '120 minutes'
    and r.created_at <= now()
),
weighted as (
  select
    store_id,
    created_at,
    score,
    case when age_min <= 15 then 0.8 else 0.8 * (120 - age_min) / 105 end as weight
  from recent
)
select
  s.id as store_id,
  case
    when coalesce(sum(w.weight), 0) > 0 then
      (array['none', 'short', 'moderate', 'long'])[round(sum(w.weight * w.score) / sum(w.weight))::int + 1]
    else 'unknown'
  end as level,
  count(w.store_id)::int as report_count,
  max(w.created_at) as last_report_at
from public.stores s
left join weighted w on w.store_id = s.id
group by s.id;

revoke all on public.store_queue_status from public, anon, authenticated;
grant select on public.store_queue_status to anon, authenticated;
