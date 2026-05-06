# MVP Research for a Desktop Construction Scheduling Prototype in Lovable

## Executive summary

Across the products reviewed, there are two fundamentally different “scheduling” paradigms that matter for your MVP definition: **(a) dependency-driven project scheduling** (CPM-style logic networks where a slip propagates through predecessor/successor links) and **(b) dispatch/appointment scheduling** (day-to-day assignment of people/crews to jobs with calendar and routing concerns, usually without task-to-task dependencies). citeturn3search18turn4search8turn1search30turn1search2

The MVP you described (desktop-only, **table-first**, dependency-driven, with **Ordering/Delivery visibility** and **Inspection milestones**) maps best to patterns found in:
- **Residential builder tools** (Buildertrend / CoConstruct / BuildBook / Builda Price / Buildxact / Wunderbuild), which tend to use **simple task logic + client/supplier coordination + “schedule drives procurement”** concepts rather than enterprise-grade schedule controls. citeturn0search22turn0search11turn7search31turn3search4turn5search7turn5search9
- **Field execution tools** (Fieldwire) that emphasize **task-level commitments, assignment, and rapid resequencing**, but typically avoid hard CPM rigor in favor of collaboration and execution transparency (e.g., shifting dates in bulk, reminders, and lightweight “related tasks”). citeturn2search3turn8search0turn8search18
- **Enterprise CPM tools** (Microsoft Project / Primavera P6 / InEight / e-Builder) as a source of “canon” for dependency types, calendars, critical path, baselines, and variance—useful for vocabulary and credibility, but far beyond what’s prototype-friendly. citeturn3search18turn4search8turn3search20turn11view0

The most believable and prototype-friendly “sweet spot” is: **FS-only dependencies (at first), push-on-slip auto-shift, milestone-as-a-task (Inspection), and procurement urgency signaling (RAG)**—all presented in a **single editable task table** with a single lightweight “Create Workflow Action” for linking tasks. This mirrors how builder tools describe dependencies and how enterprise tools default Finish-to-Start as the common relationship, without recreating full CPM. citeturn0search22turn4search4turn4search8

## Product comparison matrix

**Legend (used in tables)**  
Views: **L**=List/Table, **C**=Calendar, **G**=Gantt/Timeline, **CPM**=Critical path / network-calculation orientation  
Dependencies: **None**, **Ref** (reference links only), **FS-only**, **4-type** (FS/SS/FF/SF)  
Cascade: **Auto** (shifts linked tasks), **Manual** (no shifting), **External** (managed in imported schedule tool), **Partial** (limited)

### Scheduling mechanics

| Product | Primary scheduling model | Views offered | Core schedule fields (confirmed from public docs) | Dependencies + cascade | Lag/lead, dep types, milestones, non-working days |
|---|---|---|---|---|---|
| entity["company","ProjectManager","project management software"] | Dependency-based project scheduling | L, C, G | Tasks with dates; multiple views including task lists and calendar; Gantt supports milestones/critical-path/baselines (feature descriptions). citeturn12search2turn12search3 | Dependencies implied; positioning as MS Project alternative; cascade behavior not explicitly confirmed in retrieved pages (treat as “likely Auto,” but not proven here). citeturn12search3 | Milestones + critical path + baselines described; PTO/holidays discussed (calendar awareness). citeturn12search0turn12search3 |
| entity["company","Procore","construction management platform"] | Construction PM platform with schedule visibility + integrations | L, C, G | Schedule tool supports day/week/month evaluation + Gantt; can create calendar items; can integrate/import schedules from Primavera P6 / MS Project. citeturn0search5turn0search9 | Imported schedule tasks are described as **read-only** events; cascading is effectively **External** (done in P6/MS Project, then imported). citeturn0search17turn0search5 | CPM rigor largely depends on integrated source; Procore itself emphasizes sharing and visibility. citeturn0search5turn0search17 |
| entity["company","Buildertrend","residential construction management"] | Builder/remodeler project scheduling | L, C, G | Schedule offers multiple views; supports baseline snapshots; scheduling positioned as connected to other workflows. citeturn0search10turn0search26 | Built-in dependencies with auto-adjust: “a shift in one schedule task will cause connected tasks to adjust accordingly”; critical path view toggle is described. citeturn0search22turn0search26 | Critical path viewing described; detailed dependency-type support not confirmed in retrieved sources. citeturn0search22 |
| entity["company","CoConstruct","residential construction management"] | Residential builder client scheduling | L, C, G | Scheduling allows assignment to trade partners & team members; mentions Gantt, calendar, task view and field update contexts; milestones visible to clients (progress checkmarks). citeturn0search3turn0search7 | Explicit “predecessors” used to link tasks & create dependencies (automation framing suggests cascade), but exact cascade rules and dependency types not confirmed in retrieved snippets. citeturn0search11 | Milestones emphasized for client-facing progress; lead/lag mentioned conceptually in CoConstruct content. citeturn0search7turn0search19 |
| entity["company","Workyard","construction workforce management"] | Workforce/crew dispatch scheduling | C (team calendar), plus map | Assign work via “digital team calendar”; notes/attachments/checklists; grouping by employee or project described. citeturn1search2 | No task-to-task dependencies described (dispatch-first). citeturn1search2 | Not positioned around CPM or milestones; optimized for dispatch. citeturn1search2 |
| entity["company","Contractor Foreman","construction management software"] | SMB construction PM with CPM-style scheduling | (Likely) L + G | Product positioning highlights “Gantt (CPM) Scheduling”; also claims baseline/percent-complete + notifications in scheduling context. citeturn1search24turn4search16 | Third-party summary describes “critical path Gantt scheduler” with dependencies; exact dependency-type support not confirmed in primary docs retrieved. citeturn4search34turn4search16 | CPM language present; details on calendars/non-working days not confirmed in retrieved sources. citeturn1search24turn4search16 |
| entity["company","e-Builder","trimble unity construct cpm"] | Enterprise construction / program controls | L + G (classic CPM UI) | Columns explicitly include Task Name, Start, Finish, Duration, % Complete, Predecessors, Successors, constraints, calendars, baseline fields, variances. citeturn11view0 | Dependency types explicitly supported in predecessor/successor columns (FS/SS/FF/SF); critical path highlighting included. citeturn11view0turn10view1 | Non-working/working time via calendar management; milestones shown as “zero duration” diamonds; task status colors include on-time/late/early/no-baseline. citeturn11view0turn10view0turn10view1 |
| entity["company","Jobber","field service management software"] | Workforce/crew dispatch scheduling | C (schedule), routing/map | Create and assign jobs; spot gaps/conflicts/overlaps; route optimization and availability across team members described. citeturn1search30turn1search14turn1search1 | No CPM dependencies described (dispatch-first). citeturn1search30 | Not positioned around milestones/non-working days for CPM logic; routing and capacity focus. citeturn1search14turn1search1 |
| entity["company","B2W Software","trimble heavy civil software"] | Heavy civil resource dispatch scheduling | (Primarily) dispatch board/calendar | Emphasizes assignment/dispatch of labor, equipment, materials, trucking with real-time visibility. citeturn2search0 | Not described as dependency-based CPM; “schedule” is resource dispatch. citeturn2search0 | Milestones/dep types not described in primary page retrieved. citeturn2search0 |
| entity["company","eSUB","subcontractor management software"] | Trade/subcontractor execution scheduling | L, C, G (claimed) | eSUB blog describes viewing schedule day/week/month or Gantt and tracking by crew/team; third-party feature listing references calendars and Gantt charts. citeturn5search2turn5search11 | Dependency/cascade depth not confirmed in retrieved sources (treat as “unclear”). citeturn5search2turn5search11 | Milestones/non-working days not confirmed. citeturn5search2 |
| entity["company","Autodesk Construction Cloud","autodesk construction platform"] | Construction PM platform with centralized schedule | L, G | Schedule tool is part of Autodesk Build; training describes importing third‑party schedules and viewing in Gantt and list, filtering/sorting activities. citeturn2search2turn2search6 | Positioning emphasizes “digitized schedule” + collaboration/integration; cascade depends on whether editing is supported (not confirmed in retrieved sources—treat as “primarily External/Partial”). citeturn2search6turn2search10 | Dependency types, lag/lead, and non-working days not confirmed in retrieved sources. citeturn2search6 |
| entity["company","Buildxact","construction estimating software"] | Builder scheduling tied to estimating | L (schedule tool), (possibly timeline) | Help docs emphasize “rough in” a schedule during estimating; estimate schedule flows into job schedule when job is created. citeturn3search4turn3search23 | Dependency types/cascade not confirmed in retrieved help snippet. citeturn3search4 | Milestones/non-working days not confirmed. citeturn3search4 |
| entity["company","InEight","capital project controls software"] | Enterprise construction/project controls | CPM + SIP (methodology), tool supports CPM | Docs state CPM scheduling + short-interval planning; CPM turned on by default; as durations/logic change, system “recalculates and reshuffles activities,” updating critical path. citeturn3search2turn3search20 | Dependency-driven with automatic recalculation (Auto). citeturn3search20 | Strong CPM orientation; look-ahead alignment described; divergence flagging described. citeturn3search16turn3search20 |
| entity["company","BuildBook","home builder management software"] | Builder/remodeler client scheduling | G (Gantt emphasized) | Marketing/app listings emphasize “scheduling (with Gantt charts)” and “easy-to-use Gantt chart scheduling.” citeturn3search1turn3search9 | Dependency/cascade specifics not confirmed in retrieved sources. citeturn3search1turn3search9 | Milestones/non-working days not confirmed. citeturn3search1 |
| entity["company","Fieldwire","construction field management software"] | Trade/sub execution scheduling (task-based) | L (tasks), C, G | Gantt view schedules tasks via task start/end; users can drag dates; “Shift Dates” moves multiple tasks; task attributes include status, assignee, start/end, watchers (plus reminders); non-working days can be accounted for in settings. citeturn2search3turn8search0turn8search3turn8search1 | “Related tasks” help track dependencies, but this is not described as CPM auto-cascade (so treat as Ref + Manual). citeturn8search18turn8search0 | Non-working days supported; milestones not clearly described in retrieved scheduling docs (treat as “task-based”). citeturn8search1turn2search3 |
| entity["company","Microsoft Project","project scheduling software"] | Dependency-based CPM scheduling | L + G (canonical) | Scheduling engine explicitly accounts for task links (dependencies), constraints, calendars, and resource assignments; critical path management is a core feature. citeturn3search18turn3search10 | Dependency-driven with automatic scheduling (Auto) when in automatic mode; used as reference “scheduling engine” archetype. citeturn3search18 | Lead time mentioned in critical path guidance; calendars are part of scheduling mechanics; critical tasks can be expanded by slack threshold settings. citeturn3search18turn3search33 |
| entity["company","Oracle Primavera P6","enterprise project scheduling software"] | Enterprise CPM / project controls | G + CPM | Oracle docs explicitly define four relationship types and describe lag/lead on relationships; Primavera is the archetype for contract CPM schedules. citeturn4search8turn4search31 | Dependency-driven CPM (Auto when scheduled). citeturn4search31 | Four dependency types (FS/SS/FF/SF) + lag values described. citeturn4search8turn4search31 |
| entity["company","Microsoft Planner","work management tool"] | Lightweight collaborative work management (now adds project logic in premium) | Timeline view (project planning) | Microsoft blog describes dependencies and critical path in Timeline view; lists all four dependency types and lead/lag concepts. citeturn3search6 | Dependency support exists; exact cascade and constraint enforcement behavior not fully specified in retrieved snippet (treat as “Partial” for CPM rigor). citeturn3search6 | Four dependency types + lead/lag described. citeturn3search6 |
| entity["company","Wrike","collaborative work management software"] | Lightweight-to-midweight collaborative project scheduling | G (with table), (plus other views) | Wrike help docs define dependencies and show predecessor link creation; supports FS/SS/FF/SF and lead/lag configuration from the Gantt table. citeturn4search0turn4search4turn4search2 | Dependency-based scheduling within Gantt; operationally “Auto” in the sense that dependency constraints exist (details of push/pull policies depend on tool configuration). citeturn4search0turn4search17 | Four dependency types + lead/lag supported. citeturn4search4turn4search2 |
| entity["company","Wunderbuild","construction management software"] | Builder/remodeler scheduling + project mgmt | G (Gantt emphasized) | Product messaging emphasizes organizing tasks/materials; blog claims “intelligent Gantt” that auto-adjusts schedules and highlights critical paths. citeturn5search0turn5search9 | Dependencies + auto-adjust are claimed in vendor content (treat as “Auto, per marketing claim,” not independently verified). citeturn5search9turn5search12 | Critical path highlighting claimed; dependency-type depth not confirmed. citeturn5search9 |
| entity["company","Builda Price","builder estimating and scheduling software"] | Builder scheduling + estimating | G (Gantt) | Product features describe a visual Gantt chart, sharing schedules with clients/subcontractors, and exporting. Help content references linking tasks into predecessors/successors. citeturn5search7turn5search19 | Predecessor/successor linking explicitly referenced; cascade behavior not confirmed in retrieved material (treat as “FS-like linking likely, but unverified”). citeturn5search19 | Dependency types, lag/lead, non-working days not confirmed in retrieved sources. citeturn5search19turn5search7 |

### Execution, procurement, and risk surfacing

| Product | How users assign work | How ordering/delivery/procurement/inspections/approvals are represented | How urgency / risk / late items are surfaced | Optimized more for |
|---|---|---|---|---|
| ProjectManager | Team assignment is core to Gantt positioning; resource/holiday awareness described in resource scheduling context. citeturn12search0turn12search3 | Generic work management—procurement typically modeled as tasks/custom fields (not construction-specific in retrieved pages). citeturn12search3 | Critical path + milestones + baselines described (schedule health visibility). citeturn12search3 | Master schedule control for general projects |
| Procore | Assign calendar items to users/contacts; track by resource group or individuals. citeturn0search5 | Commitments tool handles purchase orders/subcontracts; reporting templates include overdue submittals and “Submittals Procurement.” citeturn7search16turn7search28 | Overdue reporting (submittals, etc.) is explicit; schedule tasks imported as read-only from integrated schedules. citeturn7search28turn0search17 | Day-to-day field execution + project coordination (with master schedule visibility via integrations) |
| Buildertrend | Sub notifications and connected workflows are emphasized. citeturn0search26 | Selections and purchase orders link to schedule items and deadlines (schedule-driven procurement coordination pattern). citeturn7search6turn7search30turn7search31 | Critical path toggle + dependency-driven auto-adjust; baseline to compare plan vs actual. citeturn0search22turn0search10 | Builder execution + client/supplier coordination |
| CoConstruct | Assign to trade partners & team members. citeturn0search3 | Purchase orders, bidding, and selections are part of workflow; selections have deadlines and approvals/signoffs are supported. citeturn7search15turn7search3turn7search27 | Milestones shown to clients as progress checkmarks; predecessor links framed as workflow automation. citeturn0search7turn0search11 | Client communication + builder operational cadence |
| Workyard | Assign jobs/shifts to employees/teams; organize by employee or project. citeturn1search2 | Procurement not central in retrieved docs; focus is dispatch + job instructions/checklists. citeturn1search2 | Dispatch/visibility (map + calendar) rather than CPM risk signaling. citeturn1search2 | Day-to-day field dispatch |
| Contractor Foreman | Task assignment + notifications highlighted in scheduling/Q&A content. citeturn4search16 | Claims tying permits/inspections into PM feature set (high-level, not deeply specified in retrieved sources). citeturn1search24 | CPM + baseline + percent complete (claimed); reminders of schedule changes described. citeturn4search16 | SMB “all-in-one” (some master schedule + some execution) |
| e-Builder | Schedule Manager role allocates resources; role-based editing implied. citeturn15view0turn10view0 | Includes “Event” as meeting/approval-type item (explicitly distinguishes approvals/decisions vs work). citeturn15view0 | Status indicator uses colors for late/early/on-time/no-baseline/complete; critical path highlighting in Gantt. citeturn10view0turn10view1 | Enterprise program controls / master schedule governance |
| Jobber | Assign jobs/visits/tasks to team members; availability and routing support. citeturn1search14turn1search30 | Procurement not central; schedule is customer/job visits dispatch. citeturn1search30 | Conflicts/overlaps and route efficiency surfaced. citeturn1search30turn1search1 | Field service dispatch |
| B2W Software | Dispatch of labor/equipment/materials/trucking across jobs. citeturn2search0 | Materials/trucking are explicit resource categories (dispatch lens). citeturn2search0 | Real-time visibility to keep jobs running smoothly (risk framed as resource conflicts). citeturn2search0 | Heavy civil field operations dispatch |
| eSUB | Crew/team tracking is described in scheduling blog; platform includes purchase orders as a feature area. citeturn5search2turn2search1 | Procurement represented via POs; scheduling exists but depth unclear. citeturn2search1turn5search2 | No clear “RAG” or early-warning mechanism confirmed in retrieved sources. citeturn5search2 | Trade/sub execution + documentation workflows |
| Autodesk Construction Cloud / Build | Scheduling coexists with issue/cost management; schedule tool is part of Autodesk Build. citeturn2search2 | Procurement/approvals typically live in workflows like issues/submittals/RFIs and due dates (ecosystem approach). citeturn7search13turn7search33 | Risk framing focuses on avoiding delays by keeping schedule connected; due-date templates exist for issues (signal via due/overdue). citeturn2search2turn7search13 | Coordination across schedule + project management modules |
| Buildxact | Assign tasks to team/contractors/suppliers is claimed in Buildxact blog content; the help doc emphasizes estimate-to-job schedule flow. citeturn3search11turn3search4 | Estimating-first workflow; schedule is a first draft to establish timeline and then becomes job schedule. citeturn3search4 | Risk surfacing not confirmed in retrieved sources (beyond general scheduling value claims). citeturn3search4 | Builder workflow continuity from estimate → job |
| InEight | Contributor roles and review cycles exist; schedule is a project-controls function. citeturn3search5turn3search2 | “Look-ahead schedules from master schedule” positioning suggests integration of planning layers rather than procurement-specific fields in retrieved pages. citeturn3search16 | Critical path recalculation and “flag divergences” is explicit (early warning). citeturn3search20turn3search16 | Enterprise master schedule + controls + risk |
| BuildBook | Team + client coordination is core positioning; Gantt scheduling highlighted. citeturn3search9turn3search1 | Likely models procurement as tasks or connected workflow items (not confirmed in retrieved sources). citeturn3search1 | Risk surfacing not confirmed beyond “stay on track” style claims. citeturn3search1 | Client communication + simple schedule control |
| Fieldwire | Assign tasks to users; watchers; reminders on due date; task attributes include statuses and scheduling dates. citeturn8search3turn8search10 | Tasks can represent deliveries/inspections as task items; QC/inspections exist as a broader workflow area (not deeply cited here). citeturn8search10turn8search3 | Rapid schedule edits (drag dates, shift dates), reminders, and “related tasks” for dependency awareness. citeturn8search0turn8search18turn8search3 | Day-to-day field execution |
| Microsoft Project | Assign resources; resource calendars and scheduling engine are explicit. citeturn3search18 | Procurement typically modeled as tasks or integrated via broader PM methods (not construction-specific in cited docs). citeturn3search18 | Critical path + slack threshold controls for early warning (tasks critical if slack ≤ N). citeturn3search33turn3search10 | Master schedule control / CPM rigor |
| Primavera P6 | Enterprise scheduler/planner focus; predecessors/successors and lag are core. citeturn4search8turn4search31 | Procurement often handled via schedules/logs in enterprise controls, but in cited docs the focus is relationship modeling. citeturn4search31 | CPM risk via logic network + lag/lead; critical path practices are associated, though not deeply cited here beyond relationship mechanics. citeturn4search8turn4search31 | Enterprise CPM / contract schedule |
| Microsoft Planner | Knowledge-work assignment and dependencies in timeline view described. citeturn3search6 | Procurement modeled as tasks/checklists (not construction-specific in cited docs). citeturn3search6 | Critical path and dependencies in timeline view (premium) provide risk visibility (conceptual). citeturn3search6 | Lightweight collaborative planning |
| Wrike | Task dependencies + lead/lag in Gantt; team collaboration orientation. citeturn4search0turn4search2 | Procurement typically modeled as tasks/custom workflows (not construction-specific in cited docs). citeturn4search0 | Dependencies and constraints in Gantt; lead/lag. citeturn4search17turn4search2 | Collaborative work management |
| Wunderbuild | Assign across categories to team members/suppliers is claimed; broader PM tool framing. citeturn5search12turn5search0 | Mentions organizing materials and tasks; details of procurement objects not confirmed in retrieved pages. citeturn5search0turn5search12 | Critical path highlighting claimed; auto-adjust schedule claimed. citeturn5search9turn5search12 | Small-to-mid construction teams + client portal |
| Builda Price | Client/subcontractor sharing is explicit in scheduling feature description. citeturn5search7 | Scheduling + predecessors/successors linking exists in help content; broader product also includes estimating/financial tracking. citeturn5search19turn5search7 | Risk surfacing not directly described beyond predecessor linking; focus is “visual Gantt + sharing.” citeturn5search7turn5search19 | Builder workflow + client/sub visibility |

## Common patterns found across products

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["construction scheduling gantt chart view example","critical path method network diagram construction","crew dispatch scheduling calendar board","construction procurement log delivery schedule dashboard"],"num_per_query":1}

A consistent pattern across the “construction scheduling” label is that the term covers **multiple jobs-to-be-done**, and you get a clearer MVP by choosing one primary job and borrowing only the minimal supporting patterns from adjacent jobs.

**Enterprise CPM / master scheduling** (Microsoft Project, Primavera P6, InEight, e-Builder) centers on: a logic network (predecessors/successors), constraint and calendar rules, lag/lead, baselines and variance, and critical path/float-based risk signaling. Evidence for this pattern shows up directly in relationship-type definitions (FS/SS/FF/SF) and lag mechanics (Oracle docs), “behind the scenes” scheduling engines (Microsoft), and CPM auto-recalculation (InEight) as well as e-Builder’s explicit columns for predecessors/successors, constraints, calendar, baseline, and variance. citeturn4search8turn4search31turn3search18turn3search20turn11view0  
**MVP relevance:** vocabulary and a few proven primitives (FS links, lag days, milestone concept, “at risk/late” color) are useful. Full CPM features (multiple calendars per crew, constraints, resource leveling, float calculations) are not prototype-friendly and will distract from the key value demonstration.

**Builder/remodeler project scheduling** (Buildertrend, CoConstruct, BuildBook, Buildxact, Wunderbuild, Builda Price) centers on: simple logic links (often described as “dependencies”), client-facing milestones, and schedule-driven procurement coordination (selections deadlines, purchase orders tied to schedule items, supplier/trade notifications). Buildertrend explicitly describes auto-updating schedules based on dependencies and a critical path toggle; CoConstruct explicitly describes predecessors; Buildertrend also explicitly links selections to schedule items and deadlines, and links POs/bills to schedules. citeturn0search22turn0search11turn7search6turn7search30turn7search31  
**MVP relevance:** this is the closest match to your MVP: dependency-driven task planning + ordering/delivery visibility + milestone tracking—without enterprise CPM depth.

**Crew dispatch / field service scheduling** (Workyard, Jobber, B2W) centers on: assigning people/crews to jobs in time slots, seeing capacity gaps/overlaps, and (for service) routing optimization. Workyard describes a “digital team calendar,” grouping by employee or project, and dispatch decisions; Jobber emphasizes scheduling quickly, spotting conflicts, and route optimization; B2W emphasizes dispatch of labor/equipment/materials/trucking. citeturn1search2turn1search30turn1search1turn2search0  
**MVP relevance:** useful only for the “Assigned To + User Group” metaphors and the idea of filtering by supplier/internal. Dependencies are not the core mechanic here.

**Trade/subcontractor execution scheduling** (Fieldwire, eSUB) centers on: task commitments in the field, rapid updates, start/end dates, reminders, and coordination across trades (often without strict CPM constraints). Fieldwire’s docs emphasize editing start/end dates, bulk “Shift Dates,” task assignment attributes, and “related tasks” for dependency awareness (as references). citeturn2search3turn8search0turn8search3turn8search18  
**MVP relevance:** reinforces the value of a table-first, task-centric workflow and lightweight resequencing, but it also warns against over-building a CPM engine when your prototype’s goal is to demonstrate practical coordination value.

**Lightweight collaborative work management** (Wrike, Microsoft Planner, ProjectManager) increasingly adopts Gantt + dependencies (including four dependency types and lead/lag), but typically expects teams to adapt the tool to their domain via custom fields/workflows. Wrike explicitly documents FS/SS/FF/SF creation and lead/lag; Microsoft Planner now documents dependency types and lead/lag in Timeline view; ProjectManager positions itself with multiple views including calendar and Gantt, and describes milestones, baselines, and critical path filtering in Gantt. citeturn4search4turn4search2turn3search6turn12search2turn12search3  
**MVP relevance:** strong inspiration for a clean UI and lightweight linking flows; less helpful for construction-specific procurement/inspection semantics.

## Recommended MVP scope and recommended data model

Your MVP constraints strongly suggest an intentional design choice: **opt for a “credible scheduling table”** rather than a miniature CPM tool. The table is the product; dependencies and urgency cues are the “magic tricks” that demonstrate construction value.

### MVP scope aligned to your required fields

**One primary view:** a **Task Table** where each row is a task and columns are editable. This mirrors how CPM tools present a “tasks pane” with fields/columns (e-Builder) and how field tools and work-management tools emphasize bulk edits and filtering. citeturn10view0turn8search0turn4search0

**Visible fields (exactly as you specified):**
- Task
- Task Type (Internal / Delivery / Ordering / Inspection)
- Start Date
- End Date
- Duration
- Assigned To (individual)
- User Group (Internal / Suppliers)
- Comments

**Task semantics:**
- **Inspection (Milestone)** should behave as a milestone-by-convention: set Duration to 0 and enforce Start Date = End Date when edited. This aligns with how milestone-as-zero-duration is modeled in CPM contexts. citeturn10view1turn11view0

### Recommended data model for a Lovable prototype

Lovable guidance encourages starting with mock data and adding the database later (or connecting Supabase when ready). citeturn6search11turn6search3turn6search0

**Core entities**

1) **Task**
- `task_id` (string/uuid)
- `task_name` (string)
- `task_type` (enum: Internal | Ordering | Delivery | Inspection)
- `start_date` (date)
- `end_date` (date)
- `duration_days` (number)
- `assigned_to_person_id` (fk)
- `user_group` (enum: Internal | Suppliers)  
- `comments` (text)

2) **Person**
- `person_id`
- `display_name`
- `user_group` (Internal | Suppliers)
- (optional) `org_name` (for suppliers)

3) **DependencyLink**
- `dependency_id`
- `predecessor_task_id`
- `successor_task_id`
- `relationship_type` (enum; MVP default FS)
- `lag_days` (integer; default 0)
- `auto_shift_enabled` (boolean; default true)
- `notes` (text)
- `created_at`, `created_by` (optional for prototype)

**System/computed fields (invisible but useful in the prototype)**
- `computed_earliest_start` (date): max constraint from predecessors
- `dependency_conflict` (boolean): successor starts before allowed
- `schedule_health` (enum): on_track | at_risk | late (general)  
- `procurement_alert_level` (enum): green | orange | red (for Ordering/Delivery only)

This is directly inspired by how enterprise tools expose predecessors/successors as first-class columns and how status/variance and color-coded schedule health can be tracked at the task row level. citeturn11view0turn10view0

## Recommended dependency workflow and Create Workflow Action form

### Lightweight predecessor/successor logic that stays MVP-friendly

Enterprise tools support four dependency types and lag/lead; that’s real scheduling rigor, but it expands scope quickly (edge cases, calendars, constraints, multi-predecessor resolution). citeturn4search8turn4search31turn11view0turn3search18

A lightweight MVP can still be believable by adopting three simplifying rules that match how builder-oriented tools talk about “dependencies” and “auto-adjust”:

**Rule one: one “scheduling constraint” concept**
- A dependency creates a **minimum allowed start** (or finish) for the successor.
- If auto-shift is enabled, the app **pushes** the successor forward to satisfy the constraint.
- If auto-shift is disabled, the app **flags a conflict** (don’t silently change dates).  
This is consistent with builder tools framing: “shift one task, connected tasks adjust,” while still allowing real-world discretion. citeturn0search22turn0search26

**Rule two: push-on-slip only (MVP default)**
- Only move tasks later automatically when a predecessor slips.
- Do not pull tasks earlier automatically when a predecessor moves earlier (avoid unrealistic “optimistic compression” in a prototype).  
This is not “full CPM,” but it is extremely usable and avoids surprises.

**Rule three: no calendars in MVP math**
- Treat duration as calendar days; ignore weekends/holidays in the first prototype.  
Calendars exist in more advanced tools (e-Builder calendars and working time; Microsoft Project calendars; Fieldwire accounting for non-working days), but they notably increase complexity. citeturn11view0turn3search18turn8search1

### Dependency types to include

Both enterprise scheduling and modern work management tools recognize four dependency types, and “Finish-to-Start” is widely treated as the default/common case (Wrike defaults to FS when you enter only a number; Oracle lists FS first in relationship types). citeturn4search4turn4search8

**Recommendation**
- **MVP v1:** support **Finish-to-Start (FS)** only.
- **MVP v2:** add Start-to-Start (SS) and Finish-to-Finish (FF) if needed for overlapping trades and parallel coordination.
- **Avoid Start-to-Finish (SF)** until much later; it is rare in construction coordination and adds explanatory burden. citeturn4search4turn4search8

### Exact behavior when dates change in the MVP

Below is a precise, prototype-friendly ruleset that is consistent with how dependency-based tools treat task links (dependencies constrain timing), without implementing a full scheduling engine.

**Definitions**
- For a given successor task **S**, compute:  
  `EarliestAllowedStart(S) = max over all predecessor links (PredEnd + LagDays)`  
  (FS-only MVP)

**When a task start date changes**
1) User edits `start_date` on task **T**.
2) System updates `end_date = start_date + duration_days` (preserve duration).
3) For every successor link where `predecessor = T` and `auto_shift_enabled = true`:
   - If `successor.start_date < T.end_date + lag`, then set `successor.start_date = T.end_date + lag` and recompute successor end date from duration.
4) For incoming links (tasks that must precede **T**):
   - If `T.start_date < EarliestAllowedStart(T)`, set `dependency_conflict = true` and show a subtle inline warning (do not auto-correct unless user clicks “Snap to allowed”).  
This is a lightweight analogue of how scheduling tools treat “task links affect the schedule,” while avoiding constraint creation complexity. citeturn3search18turn4search0

**When a task end date changes**
1) User edits `end_date` on task **T**.
2) System updates `duration_days = end_date - start_date` (calendar-day diff).
3) Cascade to successors exactly as above (because predecessor end changed).

**When a task duration changes**
1) User edits `duration_days` on task **T**.
2) System updates `end_date = start_date + duration_days`.
3) Cascade to successors exactly as above.

**When a predecessor slips**
- This is just “end date moved later (or duration increased)” and triggers the same cascade.  
Your UI should summarize the impact: “3 linked tasks were pushed by 4 days.”

### Recommended Create Workflow Action form

This should mirror “dependency creation” patterns in scheduling tools: you pick the tasks, choose relationship type, optional lag, and the system applies. Wrike’s dependency creation UI explicitly uses FS/SS/FF/SF codes; e-Builder exposes predecessor/successor with those same codes. citeturn4search4turn11view0

**Simplest useful form structure**
- **Source task** (dropdown / search)
- **Linked task** (dropdown / search)
- **Relationship type** (radio or select; MVP default and only option: Finish-to-Start)
- **Lag / buffer days** (optional number input; default 0)
- **Notes** (optional text)
- **Auto-shift enabled** (toggle; default ON)

**MVP UI detail that adds credibility without adding complexity**
- Show a small preview line:  
  “If Source ends on Mar 20, Linked will begin on Mar 21 (+0d lag).”
- After saving, show one toast: “Link created. 1 task shifted.”

## Recommended urgency and alert logic for Delivery and Ordering

### What “good” looks like in other tools

Several products show that a **row-level status indicator** is a widely understood way to signal schedule health:
- e-Builder explicitly documents a **status indicator color scheme** at the task row level (e.g., red=late, green=on time, yellow=early, orange=no baseline, blue=complete), and also highlights critical path tasks/relationships as a separate visual layer. citeturn10view0turn10view1
- Procore offers reporting templates that explicitly surface **Overdue Submittals** and **Submittals Procurement**, reinforcing that procurement timing risk is commonly managed through due/overdue early-warning lists. citeturn7search28turn7search16
- InEight describes automatically “flagging divergences” (e.g., dependency issues/overlaps) as a proactive communication trigger, which is essentially a risk/alert mechanism embedded in schedule logic. citeturn3search16turn3search20
- Microsoft Project supports widening “critical” identification by setting tasks critical when slack is less than or equal to a threshold—another example of **threshold-driven early warning** rather than a binary late/not-late view. citeturn3search33

Your MVP can emulate the *pattern* (row-level early warning) without implementing CPM float or baselines.

### Best-practice naming for the invisible/system field

Because your request is specifically for **Delivery and Ordering** urgency indicators, the name should clearly describe “needs attention soon” without implying full CPM risk math.

**Recommendation:** `procurement_alert_level` (enum: green | orange | red)

Why this naming works:
- It is specific to procurement-related tasks (Ordering/Delivery) rather than general schedule health.
- It mirrors common industry phrasing (“procurement” and “overdue procurement items” are explicitly present in Procore reporting templates). citeturn7search28

(If you want an even more neutral name that could later apply beyond procurement, use `attention_level` and compute it only for task types Ordering/Delivery in v1.)

### What the field should be based on

In full systems, the best practice is: **target date + lead time + buffer window** (supplier cutoff dates and risk buffers). But your MVP field list doesn’t include explicit “need-by” vs “order-by” dates or supplier lead-time fields, so your first version should use something you already have: **End Date** as the “must be done by” date.

**Recommendation (MVP v1): fixed day thresholds per Task Type**  
- Use `days_remaining = EndDate - Today` (calendar days).
- Apply thresholds that differ by Ordering vs Delivery (because ordering usually needs more warning than delivery arrival coordination).

This approach is consistent with threshold concepts used in scheduling contexts (e.g., “tasks are critical if slack ≤ N” in Microsoft Project), while staying dead-simple. citeturn3search33

### Suggested MVP thresholds

**Delivery tasks (tighter window)**
- Green: more than **7** days remaining  
- Orange: **3–7** days remaining  
- Red: **0–2** days remaining or overdue

**Ordering tasks (longer window)**
- Green: more than **14** days remaining  
- Orange: **7–14** days remaining  
- Red: **0–6** days remaining or overdue

These defaults are intentionally conservative and demonstrative. They should be presented as “configurable defaults” in the prototype, not as universal truths.

### Should thresholds vary by supplier type?

Yes in real systems, but not in your MVP.

**Recommendation**
- **MVP:** vary by **Task Type only** (Ordering vs Delivery).  
- **Later phase:** allow per-supplier overrides (e.g., “Long-lead supplier” defaults) once you add Supplier metadata and lead time fields.

This keeps the MVP credible: it demonstrates procurement timing awareness (like Procore’s procurement/overdue reporting emphasis) without building a supplier data model and lead-time engine. citeturn7search28turn7search16

### Simple-but-credible MVP implementation details

In the table:
- Color only the **Start Date / End Date** cells for Ordering/Delivery tasks (as you requested).
- Add a tooltip on hover:  
  “Red: Delivery due in 2 days (action required).”
- Add one filter: “Show Red items” (this demonstrates an execution behavior pattern similar to overdue reporting lists). citeturn7search28turn10view0

## Recommended Lovable prototype structure, plus exclusions and future phases

Lovable’s own docs emphasize that you can start with mock data, build your layouts/flows/logic, and then later connect a database (Lovable Cloud or Supabase). They also explicitly note you can use real data in prototypes by connecting to Supabase. citeturn6search11turn6search3turn6search0

### Ideal prototype pages/screens (desktop-only)

1) **Schedule Table (primary page)**
- Full-width task table with inline editing
- Column grouping (User Group) and quick filters (Task Type)
- A right-side **Task Details drawer** for Comments (so the main table stays compact)

2) **Create Workflow Action modal**
- Launched from a “Link tasks” button or context menu on a row

3) **People directory (lightweight)**
- Manage people list with User Group assignment (Internal/Suppliers)
- Keep it minimal: name + group; no permissions model in MVP

(Optionally) **Procurement Hotlist view**
- Not a separate page—just a saved filter: “Ordering/Delivery where procurement_alert_level = red/orange.”

### Core components to prototype

- **Editable data grid**: inline edit for Task Type, Assigned To, Start/End dates, Duration.
- **Dependency indicator + link viewer**: a small icon or count showing how many predecessors/successors exist (click to open a mini panel listing links).
- **Auto-shift simulation**: when editing a date/duration, show a preview banner “This will move 3 linked tasks.”
- **RAG date coloring** for Ordering/Delivery tasks.
- **Basic validation**: Inspection tasks enforce Duration=0 and Start=End.

### Local mock data structure

Use three in-memory arrays (or JSON fixtures):
- `people[]`
- `tasks[]`
- `dependency_links[]`

Keep IDs short and human-readable in early prototypes so you can debug cascades visually.

### Interactions worth prototyping

- Create an Ordering task → link it FS to a Delivery task → link Delivery to an Internal installation task → link installation to Inspection milestone; then slip the Ordering task and show the cascade + the Delivery urgency turning orange/red as dates approach.
- Toggle Auto-shift off on a link, slip the predecessor, and show a conflict state (demonstrates “human discretion” realism).
- Filter to “Suppliers” user group to show external-facing commitments (deliveries/orders) and their urgency colors.

These interactions directly demonstrate “dependency-driven task planning + procurement visibility + milestone tracking” without needing a Gantt view. citeturn0search22turn7search30turn10view0

### What to exclude from MVP

To stay lightweight and avoid recreating Primavera/Procore-style breadth, exclude:

- **Full CPM features**: critical path computation, float/slack math, baselines/snapshots, constraints, and multiple calendars—even though these exist in enterprise tools. citeturn11view0turn3search33turn4search31
- **Multiple dependency types** beyond FS (until you prove the core workflow).
- **Non-working day calendars** in date math (even though Fieldwire and e-Builder support them). citeturn8search1turn11view0
- **Drag-and-drop Gantt UI** (high effort, low incremental learning for a table-first prototype).
- **Resource leveling and capacity planning** (belongs to enterprise CPM or dispatch systems). citeturn3search18turn2search0
- **Deep procurement objects** (purchase orders, submittals, approvals workflows) as separate modules—represent them as task types for now, borrowing the “schedule drives procurement” concept from builder tools. citeturn7search30turn7search31turn7search15

### Future phase ideas

Once the MVP proves value, the most natural “phase 2” expansion paths (still avoiding full enterprise CPM) are:

- **Supplier-aware thresholds**: add hidden `lead_time_days` per supplier/task and compute a true “order-by cutoff” date (evolving toward procurement scheduling).
- **Look-ahead planning view**: a 2–6 week filter/panel derived from the same table (aligns with the master-schedule-to-lookahead pattern described in enterprise scheduling tools). citeturn3search16turn3search2
- **Optional Calendar view**: not for dependencies, but for “what’s happening this week” communication (mirrors how field tools offer calendar + batch shifting). citeturn8search6turn8search0
- **Baseline snapshot**: store one “baseline_start/end” pair per task (credibility upgrade; e-Builder explicitly uses baseline comparisons and variance fields). citeturn11view0turn14view0
- **Integration posture (conceptual only in prototype)**: “Import schedule” as a stub pathway, mirroring how Procore and Autodesk Build emphasize importing third-party schedules. citeturn0search5turn2search6