# Groups (المجموعات) — Design

Date: 2026-06-15
Status: Approved for planning
Mockups: `docs/superpowers/specs/2026-06-12-ascii-mockups.md` §7

## Summary

Add **groups** so a user can act as a **student** in a group or a **supervisor (مشرف)**
of any number of groups. A supervisor can assign deeds/sections/dhikr counters/library
bundles to students (in bulk with exclusions, or to specific students), view their
scorecards and history, and the assigned items are **locked** — the student cannot edit
or delete them, but may add their own extra items, which the supervisor also sees.

This feature crosses the app's core assumption that all data is strictly the signed-in
user's own (`auth.uid() = user_id` on every table). The design adds the smallest
cross-user surface that satisfies the requirements while keeping the student experience
fully local-first.

### Scope

**Phase 1 (this spec, launch):**
- Group create/join (invite code), one supervisor or many (all equal admins).
- A student belongs to **at most one** group (enforced). Supervisor membership is unlimited.
- Assign deeds, dhikr counters, whole sections, and library bundles — in bulk
  (all-with-exclusions) or to specific students.
- Locked assigned items on the student side; student can still add/remove their own items.
- Supervisor views: roster with today-completion, per-student detail (today + existing
  heatmap history, read-only) showing assigned and self-added items.
- Group settings: rotate/expire join code, add/remove supervisors and students.

**Phase 2 (later, additive):** allow a student in multiple groups (per-group tagging,
per-row RLS scoping, group badges, assignment-as-claim model for cross-group dedup).

**Out of scope (separate features/specs):**
- Statistics (student إحصائياتي screen, supervisor reuse, group P50 stats) — its own spec.
- Add-supervisor/student by email lookup, request-to-join moderation.

## Requirements (decided)

- **Joining:** invite code / link only (no email lookup, no request/approve).
- **Roles:** `student` and `supervisor`, stored per-membership. Group creator becomes the
  first supervisor. Any supervisor is a full admin (rotate code, manage members).
- **One student membership** per user in phase 1; many supervisor memberships allowed.
- **Assign scope:** full control — deeds, dhikr counters, whole sections, library bundles.
- **Supervisor visibility:** full read of a student's scorecard, assigned *and* self-added
  (deeds aren't private; no privacy toggle). Roster summary + per-student detail.
- **Locked:** supervisor-assigned items cannot be edited or deleted by the student;
  the supervisor can. Student-added items behave as today.
- **Unassign:** soft-delete the deed (removed from active scorecard), **logs retained**.
- **Leave / removed:** assigned items **unlock to self-owned** (`locked=false`,
  `group_id=null`), history preserved.

## Architecture

**Approach:** extend RLS, client talks to Supabase directly (no edge functions, except the
one `join_group` RPC that enforces invariants a raw insert can't).

- **Student stays fully local-first.** Supervisor-assigned rows are inserted with
  `user_id = student`, so the *existing* pull (`where user_id = me AND updated_at > lastPull`)
  brings them down with no new sync path. The only student-side change is honoring `locked`.
- **Supervisor group views are online/live.** They query Supabase directly and are **not**
  written into the supervisor's local SQLite (that store assumes `user_id = me` and powers
  the scorecard). Assignment = direct inserts/updates of student-owned rows.
- Because supervisor writes land in Supabase, each affected student pulls them on their next
  sync — natural propagation, no push channel needed.

## Data model

### New tables (Supabase + local SQLite, both synced via existing dirty/updated_at machinery)

```
groups
  id            text pk
  name          text not null
  join_code     text unique          -- current active code (12-char Crockford Base32)
  code_expires_at  text null          -- optional expiry, YYYY-MM-DD
  created_by    uuid                  -- record only; confers no special powers
  created_at    text                  -- YYYY-MM-DD
  updated_at    int / timestamptz
  deleted       boolean default false
  dirty         boolean default true  -- local only

group_members
  id            text pk
  group_id      text -> groups.id
  user_id       uuid                  -- the member
  role          text                  -- 'student' | 'supervisor'
  status        text                  -- 'active' | 'left' | 'removed'
  joined_at     text                  -- YYYY-MM-DD
  updated_at    int / timestamptz
  deleted       boolean default false
  dirty         boolean default true
  unique(group_id, user_id)
  -- invariant: a user has at most ONE active row with role='student' (phase 1)

profiles
  id            uuid pk -> auth.users.id
  name          text
  email         text
  updated_at    timestamptz
  -- upserted from the session on sign-in; readable by co-members (for roster names)
```

### New columns on `deeds`, `sections`, `dhikrs`

```
group_id     text null   -- assigning group (null = self-owned); kept for phase-2 scoping
assigned_by  uuid null   -- supervisor who assigned
locked       boolean not null default false  -- student cannot edit/delete while true
```

`deed_logs` / `dhikr_logs`: **no changes** — stay student-owned; logging unchanged.

### Identity / dedup

Assigning a deed the student already has (notably default deeds, which share the same
`definition_id` across all users) **locks the existing row** rather than creating a
duplicate. Match key: `definition_id` when present, else normalized `name` within the
student's rows. Phase 1's one-group rule means two groups can never both lock the same
deed, so a single `assigned_by`/`group_id`/`locked` triplet on the row is sufficient.
(Phase 2 replaces this with an assignment-as-claim table and derives `locked`.)

### Bulk assignment

A bulk push reuses the existing `bundleId`: one assignment of N students produces N
student-owned rows sharing a `bundleId`, so "unassign this batch" is one operation.

## Permissions / RLS

### Helper

```sql
create function is_supervisor_of(target_user uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1
    from group_members sup
    join group_members stu on stu.group_id = sup.group_id
    where sup.user_id = auth.uid() and sup.role = 'supervisor' and sup.status = 'active'
      and stu.user_id = target_user and stu.role = 'student' and stu.status = 'active'
  );
$$;
```

### Policies

- **groups** — read by any member; insert by the creator; update (rename, rotate code,
  set expiry, soft-delete) by any active supervisor of that group.
- **group_members** — read rows of groups you belong to; supervisors may insert/update
  member rows in their groups (add co-supervisors, set a student/supervisor `status` to
  `removed`). Self-join is **not** a raw insert — it goes through `join_group` (below).
- **profiles** — a user may read/write their own row; may read rows of users who share a
  group with them.
- **deeds / sections / dhikrs** — keep existing own-row policy, **add**:
  - `SELECT` if `is_supervisor_of(user_id)`.
  - `INSERT`/`UPDATE` if `is_supervisor_of(user_id)` **and** the row is group-owned
    (`group_id` is one of the caller's groups). Supervisors can never silently mutate a
    student's self-added rows.
  - **Student lock guard:** a student write (`auth.uid() = user_id`) is allowed only when
    `locked = false`. Locked rows are immutable to the student, mutable to the supervisor.
- **deed_logs / dhikr_logs** — keep own-row policy, **add** `SELECT` if
  `is_supervisor_of(user_id)`. Supervisors read logs, never write them.

### `join_group(p_code text)` RPC (SECURITY DEFINER)

Enforces what raw inserts can't:
1. Resolve the group by `join_code`; error if not found.
2. Reject if `code_expires_at` is set and in the past → `expired`.
3. Reject if the caller already has an active `student` membership → `already_member`.
4. Insert the membership (`role='student'`, `status='active'`) and return the group.

No rate-limiting needed: a 12-char Crockford-Base32 code is ~60 bits (~10^18
combinations), so brute-forcing is infeasible; expiry + rotation bound the window further.

## Sync & client behavior

### Student side (local-first; minimal change)
- Add `groups` and `group_members` to the sync configs (own membership round-trips).
- Assigned rows already arrive via the existing per-user pull.
- **Honor `locked`** in the deed store: locked deeds render a subtle "مشرف" tag and expose
  no edit/delete (no swipe). Editing is blocked client-side and by RLS.
- Tombstones already handle unassign (deed hidden, logs kept) and unlock-on-leave
  (`locked`/`group_id` cleared → normal editable deed). No special client code.

### Supervisor side (NEW, online/live)
- New module `src/state/groups.ts`: direct Supabase queries (not persisted to local SQLite).
  - Reads: roster (`group_members` + `profiles`), per-student deeds/logs (today + history),
    today-completion per student.
  - Writes: assignment = insert/upsert `deeds`/`sections`/`dhikrs` with
    `user_id=studentId, group_id, assigned_by=me, locked=true`; bulk = batched insert over
    selected students minus exclusions, sharing a `bundleId`. Unassign = set
    `deleted=true, deleted_at=today` over the batch.
- **Connectivity:** supervisor views require network; offline shows last-fetched data or a
  "تحتاج اتصالاً" state. Assignment writes are disabled offline. Student experience stays
  fully offline-capable.

### Profiles
`auth.users` isn't client-readable, so display names come from the `profiles` table,
upserted from the session on sign-in.

## UX surfaces

See mockups §7.1–7.7. Summary:
- **7.1 Hub** — student membership (max one; join action only when not a student) + groups
  I supervise + create.
- **7.2 Join** — 12-char code `XXXX-XXXX-XXXX`, also via `muhassaba://join?code=…` deep link.
- **7.3 Roster** — students with today-completion; assign + settings entry points.
- **7.4 Settings** — code rotation/expiry, manage supervisors/students.
- **7.5 Assign** — reuse library picker (what) → recipients (all-with-exclusions | specific).
- **7.6 Student detail** — read-only today + existing heatmap history; assigned + self-added.
- **7.7 Student scorecard** — assigned deeds show a subtle "مشرف" tag, no edit/delete.

A user can be a supervisor of some groups *and* a student in their one group; the hub lists
"مجموعتي كطالب" and "المجموعات التي أشرف عليها" separately.

## Invite code

12 chars, Crockford Base32 (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`, omits ambiguous I/L/O/U,
case-insensitive, fully URL-safe — no special characters). Displayed grouped as
`XXXX-XXXX-XXXX` (dashes are presentation only). ~60 bits entropy (~10^18 combinations),
so guessing is infeasible without rate-limiting. Defenses: optional expiry and manual
rotation (overwriting invalidates the old code instantly; already-joined members are
unaffected since membership is a row, not the code).

## Edge cases

- **Code expired/invalid/rotated mid-join** → typed `join_group` error → "الكود غير صحيح أو منتهي".
- **Already a student elsewhere** → `already_member` → "أنت بالفعل في مجموعة".
- **Assigning a deed the student already has** → lock existing row, no duplicate.
- **Unassign after the student logged it** → deed soft-deleted, logs retained, day score recomputes.
- **Offline supervisor** → cached/last-fetched view; assignment disabled.
- **Student offline when assigned** → row arrives on next sync; nothing special.
- **Leave / removed** → assigned rows unlock to self-owned; membership `status` set, not hard-deleted.
- **Last supervisor leaving** → blocked (a group must keep ≥1 active supervisor).
- **Concurrent assign + student edit** → student can't edit locked rows; sync last-writer-wins handles the rest.

## Testing

- **DB/RLS (critical):** supervisor reads/inserts/updates only their students' group-owned
  rows; student cannot write locked rows; non-members see nothing; `join_group` enforces
  code validity, expiry, and the one-student-group rule; profile read scoping.
- **Domain/unit:** assignment dedup by `definition_id`/name; unlock-on-leave transition;
  score recompute after unassign.
- **Sync:** assigned rows pull to the student; unassign tombstone hides the deed, keeps logs;
  membership round-trips.
- **UI:** locked deeds render the مشرف tag with no edit/delete; roster today-completion math;
  join-flow error states; one-group hub states (7.1).

## Phase 2 notes (not built now)

Multi-group support is purely additive: introduce a `group_assignments` claims table,
derive `locked` from the active claim set, add per-row RLS read scoping
(`group_id ∈ my groups` + self-added), group badges on the scorecard, and backfill existing
`assigned_by` rows into claims. No phase-1 schema is invalidated — `group_id` is already on
every assignable row.
