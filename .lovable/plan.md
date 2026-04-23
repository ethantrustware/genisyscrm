# Bring the portal in line with the Orbitask design reference

The current build has the right bones — Orbitask-style sidebar, blue primary on white, pastel status chips, avatar stacks, segmented tabs — but several reference patterns are missing or look generic. This plan applies the uploaded reference (the Orbitask Marketing Tasks screenshot is canonical, plus the Today / Tasks-board / Agents / Clients mocks) consistently across every screen.

I cannot extract the two `.zip` design archives in plan mode (read-only sandbox), so I'll use the seven screenshots as the authoritative source. Once the plan is approved I can also unzip and pull any extra component imagery to fine-tune.

## Scope of changes

### 1. Navigation (3 → 5 sections)
The user previously asked for three tabs, but the new screenshots add **Today** and **Agents** as first-class screens. Update the sidebar nav to:

- Today (☀️ default landing)
- Tasks (✅)
- Call Center (📞)
- Agents (👥)
- Clients (🏢)

Routes: rename `/_app/index.tsx` to render Today; move the existing Tasks page to `/_app/tasks.tsx`; add `/_app/agents.tsx`. Keep Call Center and Clients as-is structurally.

### 2. Today screen (new) — matches screenshot 3
- Date eyebrow ("WEDNESDAY, APRIL 23"), big greeting "Good afternoon, Kenji 👋", prose subline ("You have 6 meetings today across 4 clients. Team is pacing 42 appointments, $1.84M pipeline.")
- Top-right pill cluster: date pill + primary `+ New task` pill
- 4 KPI cards (Meetings today / Tasks to do / Team appts / Pipeline) with thin progress bars in soft blue / amber / blue / mint
- Two-column body: **Next up** meeting list (first row highlighted in `primary-soft` with Join button, others outline `Details`) and **My tasks** checklist with strikethrough completed items, status chips (Flagged / Elise waiting / High), and a quick-add row at the bottom
- **Callbacks scheduled** row of 3 cards beneath

### 3. Tasks — Kanban (new view) + List polish — matches screenshot 5
- Add a real Kanban view alongside the existing Table view, switched via the same view tabs. Default to Kanban on `/tasks` to mirror the reference.
- 4 columns: To Do, In Progress, Blocked, Done with count badges; no column background, just title + count
- Cards: small uppercase category eyebrow + colored dot, title, due-day text, assignee avatar pinned bottom-right, soft white card with `shadow-soft`
- Done column items render with strikethrough and reduced opacity
- Each column ends with a dashed `+ Add task` row
- Above the columns: scope segmented pills (Daily / Weekly / Monthly / Quarterly), Board/List sub-tabs on the left, Filter + All assignees + `+ New task` on the right
- Keep current Table view; restyle its top actions to match (segmented scope pills row added above)

### 4. Agents directory (new) — matches screenshot 6
- Big "Agents" title with prose subline
- Right-side actions: `All pods` filter pill, `+ Invite agent` primary pill
- Pods rendered as expandable accordion rows (collapsed: name, eyebrow meta, avatar stack, toggle on the far right; expanded: roster table inset with Dials / Appts / Show / Pipeline columns and a colored status dot on each avatar)
- Aurora expanded by default; Meridian and Solace collapsed

### 5. Clients — tighten to match screenshot 7
- Replace the current breadcrumb-heavy TopBar on this page with the cleaner Orbitask header used in the reference: bold "Clients" + subline "Eight active engagements. $1.77M pipeline generated this quarter across the book.", `All industries` + `+ New client` pills on the right
- Stat row: Pipeline QTD (green), Appts set, Avg show, Active clients — already correct, just confirm spacing
- Table: keep the current row layout but uppercase the column headers to match the reference (`CLIENT / INDUSTRY / AGENTS / APPTS / PIPELINE / STATUS`)

### 6. Call Center — small tightening
- Move the segmented tab strip to a true pill segmented control (matches the Tasks scope pills) instead of underlined text tabs, to align with the reference component language
- Keep Appointments / Callbacks / EOD Reports / Leaderboard sub-tabs and content as-is

### 7. Sidebar polish — matches screenshot 1
- Add the small theme/moon toggle next to the Genisys wordmark (icon-only)
- Keep workspace switcher, ⌘K search pill, Main menu list, Pods list, Settings, user card — these are already correct
- Active nav item: keep `bg-primary-soft text-primary` pill style (matches reference)

### 8. Shared TopBar
The reference Marketing Tasks screenshot shows a TopBar with breadcrumbs + Add Member cluster on the right. Keep the existing `TopBar` component for Tasks (where breadcrumbs make sense) and use simpler page headers (title + subline + right-side action pills) for Today / Agents / Clients where the reference shows that pattern.

## Files I'll create / edit

```text
src/components/layout/AppLayout.tsx        edit  (5-item nav, theme toggle, simpler PageHeader export)
src/routes/_app.index.tsx                  rewrite → Today landing
src/routes/_app.tasks.tsx                  new   → moved from old index, adds Kanban view
src/routes/_app.agents.tsx                 new   → expandable pod accordion
src/routes/_app.call-center.tsx            edit  → segmented pill tabs
src/routes/_app.clients.tsx                edit  → simpler header, uppercase columns
src/components/tasks/KanbanBoard.tsx       new   → reusable column/card components
src/data/tasks.ts                          new   → shared kanban + list task fixtures
```

No new dependencies. All interactions are local state (no backend calls).

## Out of scope for this pass
- Agent detail page, Client detail page, Reports module, Settings — referenced in the original spec but not in the uploaded screenshots; can be added in a follow-up.
- Dark mode QA pass (tokens already exist in `styles.css`).
- Extraction of additional component snippets from the two `.zip` archives — possible after approval if you want me to mine them for extra UI.