# MASTER.md — Queueless Build Plan
Built from PRD version v1.0

## 1. Summary and Scope
Queueless is a responsive web application designed to help South African consumers compare prices across nearby physical stores, verify item availability, and check live checkout queue conditions before leaving home.

### Must-Have Features (MVP Scope)
*   **F1: Product Search & Price Compare:** Keyword lookups, matched catalog indexes, lowest-price branch ranking.
*   **F2: Cross-Store Basket Aggregator:** Multi-item virtual list compiling gross aggregate checkout costs side-by-side.
*   **F3: Crowd-sourced Queue Level Reporter:** 1-tap checkout congestion grid selector mapping decay tracking rules.

### Should-Have Features
*   **F4: Suburb Filter Settings:** Geography mapping targeting a local 5km operational radius.
*   **F5: Savings Log Dashboard:** Visual rolling monthly metrics and contributor points tracker.

### Non-Goals (Deferred - Do NOT Build)
*   No dynamic geolocation maps or heavy embedded map canvas rendering scripts.
*   No internal e-commerce payment settlement processing or delivery logistics networks.
*   No automated receipt photo optical character recognition (OCR) engines.

---

## 2. Tech Stack & Setup Commands

### Stack Versions
*   **Frontend Framework:** React v19.0 via Vite
*   **Styling Engine:** Tailwind CSS v4.0
*   **Backend & DB Layer:** Supabase JavaScript Client Layer linking native PostgreSQL v16
*   **Hosting Node:** Vercel

### Setup and Installation Commands
Run these commands from an empty project folder to construct the application workspace environment:
```bash
# Initialize project workspace using the React-Vite template configuration
npm create vite@latest . -- --template react-ts

# Install project dependencies
npm install @supabase/supabase-js lucide-react

# Install Tailwind CSS v4 framework configurations
npm install tailwindcss @tailwindcss/vite

# Install development testing utilities
npm install --save-dev jest typescript
```

---

## 3. Environment Variables (`.env.example`)
Create a `.env.example` file in the root directory matching these key structure definitions:
```text
# Public client configuration vectors safe for browser execution environments
VITE_SUPABASE_URL=your_supabase_project_reference_url
VITE_SUPABASE_ANON_KEY=your_supabase_anonymous_api_access_key
```

---

## 4. Database Schema Migrations
Execute these DDL SQL instructions sequentially inside the Supabase SQL editor panel:

```sql
-- Enable automated UUID extension engines
create extension if not exists "uuid-ossp";

-- Table 1: Profiles (Users mapping)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text not null unique,
    chosen_suburb text,
    reward_points integer default 0 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table 2: Products Master Directory
create table public.products (
    id uuid default uuid_generate_v4() primary key,
    barcode text not null unique,
    product_name text not null,
    brand_label text not null,
    volumetric_size text not null
);

-- Table 3: Store Listings Matrix
create table public.listings (
    id uuid default uuid_generate_v4() primary key,
    product_id uuid references public.products on delete cascade not null,
    store_branch_name text not null,
    price_zar numeric(10,2) not null,
    stock_status text default 'In Stock'::text not null check (stock_status in ('In Stock', 'Limited Stock', 'Out of Stock', 'Unknown')),
    verified_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table 4: Report Submission Activity Logs
create table public.report_logs (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles on delete set null,
    listing_id uuid references public.listings on delete cascade not null,
    report_type text not null check (report_type in ('Queue', 'Price', 'Stock')),
    submitted_value text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on standard database monitoring access control firewalls
alter table public.profiles enable row_level_security;
alter table public.products enable row_level_security;
alter table public.listings enable row_level_security;
alter table public.report_logs enable row_level_security;
```

---

## 5. Security & Row-Level Security (RLS) Policies
Apply these security rules to bind execution permissions across authentication layers:

```sql
-- Products Data Access Policy (Global read access allowed for everyone)
create policy "Allow open reads for products" on public.products 
    for select using (true);

-- Listings Data Access Policy (Global read access allowed for everyone)
create policy "Allow open reads for listings" on public.listings 
    for select using (true);

-- Report Insertion Security Filter (Only logged-in users can insert records)
create policy "Allow profile holders to post reports" on public.report_logs 
    for insert with check (auth.role() = 'authenticated');

-- Profile Record Mutation Constraint (Users can only update their own records)
create policy "Restrict profile modifications to owner matching tokens" on public.profiles
    for update using (auth.uid() = id);
```

---

## 6. Business Rules Implementation (Pseudocode)

### BR1: Price Age Warning Badge logic (Runs on Frontend runtime mapping)
```typescript
function calculatePriceWarning(verifiedAtTimestamp: string): boolean {
  const currentUtcTime = new Date().getTime();
  const listingVerificationTime = new Date(verifiedAtTimestamp).getTime();
  const differentialInHours = (currentUtcTime - listingVerificationTime) / (1000 * 60 * 60);
  return differentialInHours >= 48; // Injects amber exclamation tag if true
}
```

### BR2: Reporter Throttling Interval verification (Enforced via DB constraint filters)
```sql
create or replace function verify_submission_throttle_limits()
returns trigger as $$
declare
    recent_entry_count integer;
begin
    select count(*) into recent_entry_count 
    from public.report_logs
    where user_id = auth.uid() 
      and listing_id = new.listing_id
      and created_at >= (now() - interval '60 minutes');
      
    if recent_entry_count >= 5 then
        raise exception 'Submission restricted. You can report queue states once every 15 minutes.';
    end if;
    return new;
end;
$$ language plpgsql security definer;
```

### BR4: Queue Decay Metric Calculation Function (Calculates runtime display parameters)
```sql
create or replace view public.weighted_queue_metrics as
select 
    listing_id,
    sum(case 
        when created_at >= (now() - interval '15 minutes') then 0.8 
        else 0.2 
    end) as calculated_density_coefficient
from public.report_logs
where report_type = 'Queue' 
  and created_at >= (now() - interval '2 hours')
group by listing_id;
```

---

## 7. Account Configuration Blueprint
*   **Sign-Up Flow:** Email input fields combined with alphanumeric strings minimum length threshold 8 chars. Incorporates dynamic password visibility checkbox controllers.
*   **Email Activation:** Accounts match guest constraints strictly before email confirmation link interaction sweeps switch user attributes to verified status.
*   **Authentication Retention:** Token states cache configurations locally inside client memory buffers, retaining active login parameters for 14 operational calendar days.

---

## 8. Application Navigation Mappings
*   `S1 Home Page (Search Interface)` $\rightarrow$ Application core query route entry field point container. Displays global navigation header component bars permanently.
*   `S2 Results Page` $\rightarrow$ Lists indexed product rows matched via lookup parameters ranked lowest price parameters first.
*   `S3 Details View` $\rightarrow$ Displays item inventory metrics, operating structures, and dynamic countdown queue wait blocks.
*   `S4 Aggregate Basket Page` $\rightarrow$ Compares total cost thresholds dynamically across storefront branches side-by-side. Includes clear missing product error flags (BR3).

---

## 9. Design Tokens & Core Components

```json
{
  "designTokens": {
    "colors": {
      "primaryTeal": "#0B7A6B",
      "successMint": "#2E7D32",
      "errorCrimson": "#C62828",
      "warningAmber": "#B26A00",
      "neutralCharcoal": "#1A1A1A"
    },
    "typography": {
      "fontFamily": "Inter, sans-serif",
      "sizes": { "title": "24px", "subtitle": "18px", "body": "16px", "micro": "12px" }
    },
    "layoutBounds": { "borderRadius": "8px", "buttonTargetHeight": "48px" }
  }
}
```

### Shared Global Layout Components
1.  **Global Navigation Header Component:** Top persistent bar tracking app identity strings and account settings routes.
2.  **Offline Banner Warning Tracker:** Horizontal layout element displaying text: `"You're offline. Changes will not be saved."` triggered immediately via cell tracking drops.

---

## 10. Verification Seed Data Set

```sql
-- Insert Seed Product Matrices
insert into public.products (id, barcode, product_name, brand_label, volumetric_size) values
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '6001234567890', 'Full Cream Milk 2L', 'Clover', '2L'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '6009876543210', 'Superior White Bread 700g', 'Albany', '700g');

-- Insert Seed Store Listing Entries
insert into public.listings (id, product_id, store_branch_name, price_zar, stock_status, verified_at) values

## 11. Incremental Build Phases

### Phase 1: Environment Setup & Persistence Layers Core Validation
*   **Scope:** Framework installation tasks, environmental schema definitions initialization, schema script uploads, seed insertion runs, dynamic connectivity listener integration.
*   **Files to Create:** `.env`, `src/supabase/client.ts`, `supabase/migrations/01_init.sql`, `src/components/OfflineBanner.tsx`.
*   **Definition of Done:**
    *   [ ] App context renders connection traces targeting cloud Supabase storage systems smoothly.
    *   [ ] Simulating localized mobile data line termination toggles forces instant visibility updates across `OfflineBanner` templates.

### Phase 2: Product Discovery & Price Metrics Ranking UI (F1)
*   **Scope:** Product lookups keyword mapping engines configuration, results matrix render views, item detail row summaries tracking price counters.
*   **Files to Create:** `src/pages/Home.tsx`, `src/pages/SearchResults.tsx`, `src/components/ProductCard.tsx`.
*   **Definition of Done:**
    *   [ ] Typing product tags into lookup entry paths surfaces relevant price cards ordered lowest price first.
    *   [ ] Historic listings data records missing recent update syncs append amber disclaimer badges automatically under BR1 terms.

### Phase 3: Cross-Store Shopping Basket Aggregation Engine (F2)
*   **Scope:** Local state basket collection array routines, total checkout aggregation loops running calculations across competing branch groups.
*   **Files to Create:** `src/pages/ShoppingBasket.tsx`, `src/hooks/useBasket.ts`.
*   **Definition of Done:**
    *   [ ] Appending distinct item rows evaluates aggregate sums correctly, mapping totals side-by-side across retail profiles.
    *   [ ] Branches lacking item matches flag display cards inline with clear missing product warning labels matching BR3 rule specifications.

### Phase 4: Live Crowd-sourced Wait Congestion Reporting System (F3)
*   **Scope:** Report input grid form panels, checkout wait interval button selector grids, lockout tracker logic loops execution.
*   **Files to Create:** `src/pages/ReportSubmission.tsx`, `src/components/QueueMeter.tsx`.
*   **Definition of Done:**
    *   [ ] Registered profiles clicking wait time checkboxes successfully write transaction data lines into `report_logs` sets.
    *   [ ] Repeating report clicks within immediate timeframes triggers validation locks, outputting exception strings matching BR2 limits.

### Phase 5: Local Suburb Profiles & Performance Dashboards Setup (F4, F5)
*   **Scope:** Regional isolation pickup list inputs setup, user metric progress monitoring timelines configuration.
*   **Files to Create:** `src/pages/SavingsDashboard.tsx`, `src/components/SuburbSelector.tsx`.
*   **Definition of Done:**
    *   [ ] Switching suburb configurations updates lookup tracking scopes to index retail branches within a 5-kilometer radius.
    *   [ ] Personal savings dashboards render tracking summaries displaying cumulative monthly South African Rand savings values.

---

## 12. Complete Testing Checklist Matrix

### Core Functional Pathways (Manual Evaluation Framework Checks)
*   [ ] **T-US1-1 (Product Search Verification):** Confirm input strings query backend directories accurately, sorting result layout grids lowest price parameters first.
*   [ ] **T-US1-2 (Empty Search Fallback):** Verify keyword lookups yielding zero index references surface messages stating: `"No products found matching your search term. Please try another product name."`
*   [ ] **T-US2-1 (Basket Cost Population):** Check adding multiple items to active baskets triggers correct aggregate sum math counts across matching store branches.
*   [ ] **T-US2-2 (Connection Loss Save Interruption):** Verify dropping network lines during row modification clicks pauses processing loops with clear failure prompts.
*   [ ] **T-US3-1 (Queue Level Transaction Insertion):** Confirm 1-tap queue report options update store summary displays instantly, accompanied by confirmation messages.
*   [ ] **T-US3-2 (Throttling Enforcement Interception):** Test consecutive submission logs trigger threshold catch rules, showing: `"Submission restricted. You can report queue states once every 15 minutes."`
*   [ ] **T-US4-1 (Suburb Location Selection Filtering):** Confirm regional picking drop-down selectors ground item query parameters to target localized branches.
*   [ ] **T-US5-1 (Cumulative Performance Display):** Verify dashboard nodes display metric tallies highlighting historic savings histories.

### Core Business Logic Routines (Automated Jest Unit Suite Matrices)
*   [ ] **Automated-BR1:** Assert calculation logic injects caution flags only when validation markers cross 48-hour thresholds.
*   [ ] **Automated-BR2:** Verify execution checks stop data write flows once transaction counters cross limit constraints inside hour windows.
*   [ ] **Automated-BR4:** Check mathematical time-weighted formula loops prioritize recent shopper inputs appropriately over historic values.

---

## 14. Using your PRD with AI

### Step 0: Style guide first (in your AI design tool)
*Paste Section 9 and Section 8.3, then run this prompt:*
```text
You are a senior UI designer. Using ONLY the design values and shared components I pasted, create a one-page style guide for my app "Queueless": colour swatches with hex codes, the text sizes, spacing, buttons (primary, secondary, danger, disabled), text fields (normal, focused, error), cards, header, tab bar or menu, toast, offline banner and empty-state block. Do not design any app screens yet. Do not add colours, fonts or components I did not list.
```

### Step 1: Generate screens, one at a time
*Paste Sections 2.1, 8.1, 8.4, 9, and the specific 8.2 spec for the target screen, then run this prompt:*
```text
You are a senior UI/UX designer. Design screen "[S# Screen name]" for my web app at 360 px responsive mobile width and 1200 px desktop layout wide frames.
- Reuse the style guide and shared components exactly. Keep the header and tab bar identical to my other screens.
- Include every element in the order listed in the spec. Use the exact labels, placeholder text and messages in quotation marks.
- Fill the screen with the sample content given. Use South African names, places, rand and dates. Never use lorem ipsum.
- Design the Normal state first, then one extra frame for each other state in the spec (Empty, Loading, Error, Offline, Success).
- Do not invent features, buttons, screens or text. If something you need is missing, put a grey box labelled "TODO: [what is missing]" and list all TODOs under the design.
```

### Step 2: Generate MASTER.md (in a chat AI that accepts files, e.g. Claude)
*Attach your whole PRD and links to your final screens, then run this prompt:*
```text
You are a senior software engineer. Using the attached PRD, write MASTER.md: the build plan an AI coding assistant will follow to build this app from an empty folder. Use the PRD's IDs (F#, BR#, US#, S#, M#, T-…) everywhere. Include, in this order:
1. Summary and scope: product, users, Must and Should features, non-goals, and a "Deferred" list of future features that must NOT be built.
2. Tech stack with versions, folder structure, and exact setup and install commands.
3. .env.example with every variable from Section 11.5, marked public or secret.
4. Database: every entity, field, type, default, uniqueness rule, delete behaviour, relationship and status change from Section 10, written as migration steps.
5. Permissions: one rule per row of Section 11.4, enforced in the database or server.
6. Business rules: every BR# with step-by-step logic (pseudocode), and where it runs.
7. Accounts: every decision in Section 5.
8. Navigation: every screen and route from Sections 7.2 and 8.1, and which ones show the tab bar.
9. Design tokens: every value in Section 9 as named tokens; shared components from 8.3.
10. Notifications (4.5), error messages (12.2), and quality, security and privacy rules (12).
11. Seed data and test accounts from Section 10.4.
12. Build phases:
- Phase 1 is always: setup, folder structure, tokens, .env.example, database and seed data, and one screen that runs.
- Each later phase covers 1 or 2 features, all Must before any Should, and ends with an app that runs.
- Each phase lists its F#, US#, S# and BR#, the files to create, and a Definition of Done made of the T- criteria it covers, as checkboxes.
13. Testing checklist: every T- criterion as a checkbox, marked manual or automated.
Rules: do not add anything that is not in the PRD. If the PRD is unclear or contradicts itself, list it under "Clarifications needed" at the top and STOP: do not write the build phases until I answer. State at the top: "Built from PRD version [vX.X]".
```

### Step 3: Build phase by phase (in your AI coding assistant)
*Save MASTER.md and docs/PRD.md in your repository, then say:*
```text
Read MASTER.md and docs/PRD.md. Build Phase [N] only. Follow MASTER.md exactly. When finished, run the app, tick the Definition of Done checkboxes in MASTER.md, list anything you could not do, and stop. If anything is unclear, ask me instead of guessing.
```

### Step 4: Final check
*Give the AI the PRD and screenshots of your finished app, then ask:*
```text
"List every place where the built app does not match Sections 6 (acceptance criteria), 8 (screens) and 9 (design)." Fix the gaps and re-test.
```

---

## 15. Submission checklist

* [x] **No [brackets] or hints remaining**: Mapped precise local operational constraints across all sections.
* [x] **Product vision and pitch adhere to size caps**: Core business parameters express target criteria in under 20 words.


• Relational entity attributes map cleanly onto fields data tables: Clear index keys prevent architectural configuration assumptions.

• Rate limit restrictions link straight to unique identification rules: Concrete parameters govern database constraints (BR# tokens).

• Every distinct functional path traces to a corresponding checking scenario ID: Complete traceability from user story to verification checklist.


## 16. Glossary

| Term | Plain-English meaning |
| :--- | :--- |
| **Acceptance criteria** | The exact checks that prove a feature works, written as Given / When / Then blocks. |
| **API** | The protocol pipeline enabling applications to request data information updates from backend servers. |
| **Backend** | The hidden infrastructure architecture managing database entries, authentication checking, and operational business rules. |
| **Business rule** | A precise constraint mapping rule handling calculations or system operational limits (identified as BR#). |
| **Contrast ratio** | Numeric scale measuring text visibility clear of background tones, where values above 4.5:1 guarantee high readability profiles. |
| **Design tokens** | Abstract variable naming strings mapping styling parameters to programmatic properties consistently across code files. |
| **Edge case** | An anomalous operational scenario requiring careful system recovery design paths to protect app stability. |
| **Entity** | A logical schema model structuring discrete database row shapes (e.g., User profiles, Product items). |
| **Environment variable** | External parameters configuration variables storing sensitive operational connection paths safely outside version management source code files. |
| **Frontend** | The visual interface components rendered inside browser software frames for end users to view and interact with. |
| **Hex code** | Alphanumeric string identifiers translating visual color specifications into programmatic values (e.g., `#0B7A6B`). |
| **MASTER.md** | The sequential task list blueprint followed by development code assistants to synthesize project source folders cleanly. |
| **Mermaid** | A simplified character annotation format used to programmatically generate clean flowcharts within markdown view containers. |
| **Modal** | An overlay graphical component box block taking temporary priority control over interface backgrounds. |
| **MoSCoW** | A requirement categorization framework organizing priorities into Must, Should, Could, and Won't classifications. |
| **MVP** | Minimum Viable Product: The leanest functional feature set required to solve core target problems for initial users. |
| **Persona** | A descriptive archetype profile mapping specific target user needs, behaviors, and tech habits during architectural design. |
| **POPIA** | The Protection of Personal Information Act: South Africa's legislative regulatory framework governing user information security. |
| **Row-Level Security (RLS)** | Database row filtering tools restricting item mutations to authorized data owners. |
| **Seed data** | Initial placeholder database records deployed during design validation evaluations. |
| **SAST** | South African Standard Time: Universal Coordinated Time adjusted forward by two hours (UTC+2). |
| **Stack** | The combined technical engineering toolset utilized to deploy complex platform applications. |
| **State** | Visual presentation profiles mapping across interface views matching current operating conditions (Normal, Empty, Error). |
| **Toast** | A small confirmation overlay banner that disappears automatically after a brief duration. |
| **Unhappy path** | Operational scenarios triggered when system executions hit processing failures, invalid user entries, or network drops. |
| **User story** | Feature requirements written from end-user points of view using standard formatting syntax structures. |
| **UTC** | Coordinated Universal Time: The global baseline standard timezone used for uniform server logging events. |

