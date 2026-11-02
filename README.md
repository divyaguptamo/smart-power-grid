# Smart Power Grid Management and Energy Resource Allocation

DBMS Experiential Learning, Level 3 project, Section 5K.

| Member | SRN |
|---|---|
| Divya Gupta | PES2UG24CS901 |
| Vidya Sri Ganesh | PES2UG24CS667 |

A web console for a regional power grid. Operators allocate plant output to grid zones, track outages and maintenance, and watch live smart-meter telemetry. Consumers see their own usage and report outages.

* **MySQL 8** holds transactional master data (users, plants, zones, allocations, outages, maintenance) where integrity matters: keys, constraints, triggers, stored procedures and transactions.
* **MongoDB** holds high-volume, append-only meter readings (time-series collection) and grid events whose fields differ by event type.
* **Next.js 14** provides the UI and the API layer (route handlers) that talks to both databases.

## Repository layout

```
sql/
  01_ddl.sql                 tables, keys, constraints, indexes, view
  02_dml_and_advanced.sql    sample data, queries, transaction, trigger, procedure, function, full-text
  03_level3_additions.sql    bcrypt passwords, extra CHECKs, views, triggers, transactional procedures
  04_test_cases.sql          18 database test cases (run with --force)
scripts/
  seed-mongo.mjs             creates MongoDB collections, validators, indexes and sample telemetry
  hash-password.mjs          prints a bcrypt hash
app/                         Next.js pages and API route handlers (app/api/...)
components/                  shared UI components
lib/                         database pools, auth, validation, error mapping, Mongo pipelines
middleware.js                page-level role checks
docs/                        screenshots and SQL test output
```

## Setup

### 1. Requirements

* Node.js 20.6 or newer
* MySQL 8.0.16 or newer (CHECK constraints are enforced from 8.0.16)
* MongoDB 6 or newer (local install or a free MongoDB Atlas cluster)

### 2. MySQL

```bash
mysql -u root -p < sql/01_ddl.sql
mysql -u root -p < sql/02_dml_and_advanced.sql
mysql -u root -p < sql/03_level3_additions.sql
```

Create a least-privilege account for the app (it cannot drop or alter tables):

```sql
CREATE USER 'grid_app'@'localhost' IDENTIFIED BY 'choose-a-password';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON smart_power_grid.* TO 'grid_app'@'localhost';
```

Optional: run the database test cases (some are expected to fail; that is what they test):

```bash
mysql -u root -p --force smart_power_grid < sql/04_test_cases.sql
```

Run the test cases on a copy, or re-run scripts 01 to 03 afterwards, because they insert extra rows.

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in your own values. Wrap a value in double quotes if it contains `#` or spaces, otherwise everything after `#` is treated as a comment. `.env.local` is git-ignored; never commit credentials.

### 4. Install, seed MongoDB, run

```bash
npm install
npm run seed:mongo     # reads meters from MySQL, writes 30 days of hourly readings + grid events
npm run dev            # http://localhost:3000
```

For a production build: `npm run build && npm start`.

### Demo accounts

All seeded accounts use the password `Grid@2026`.

| Role | Email | Can do |
|---|---|---|
| Admin | arjun@gmail.com | everything, plus users, new plants and resources |
| Operator | meera@gmail.com, vikram@gmail.com | allocations, plants and zones, outages, maintenance, telemetry |
| Consumer | rahul@gmail.com, sneha@gmail.com | own usage, report outages in own zone |

New consumers can register from the sign-in page.

## Feature map

| Requirement | Where |
|---|---|
| DDL: CREATE, ALTER, DROP, keys, constraints, indexes, views | `sql/01_ddl.sql`, `sql/03_level3_additions.sql` |
| DML: INSERT, UPDATE, DELETE, SELECT, JOIN, GROUP BY, HAVING, subqueries | `sql/02_dml_and_advanced.sql`, API routes |
| Transactions | `sp_allocate_power`, `sp_update_allocation_power`, `sp_resolve_outage`, `sp_register_consumer` |
| Triggers | audit log, allocation validation, status flow, outage to zone status, maintenance to plant status |
| Stored procedures and functions | `GetZoneAllocations`, `CalculatePlantUtilization`, `fn_plant_headroom`, procedures above |
| Indexing and full-text search | `ft_resource_search` used by Backup resources search |
| NoSQL aggregation | `/api/analytics`, `/api/readings`, `/api/dashboard` (`$facet`, `$group`, `$dateTrunc`) |
| Authentication, 3 roles | `lib/session.js`, `lib/auth.js`, `middleware.js` |
| Validation at database level | CHECK constraints, triggers with `SIGNAL`, `$jsonSchema` on `grid_events` |
| Security | bcrypt hashes enforced by a CHECK, httpOnly signed cookies, parameterised SQL, env config |

## API overview

| Method and path | Roles | Purpose |
|---|---|---|
| POST /api/auth/login, /logout | public | session cookie |
| GET, POST /api/auth/register | public | zones list, consumer sign-up (transaction) |
| GET /api/dashboard | staff | zone load, plants, totals, open events |
| GET, POST /api/allocations | staff | list with filters, create via `sp_allocate_power` |
| PATCH /api/allocations/:id | staff | change power (audited) or move status forward |
| GET /api/allocations/:id/log | staff | audit history |
| GET, POST /api/plants, PATCH /api/plants/:id | staff (POST admin) | plants |
| GET /api/zones, PATCH /api/zones/:id | staff | zones and demand |
| GET, POST /api/resources, PATCH, DELETE /api/resources/:id | staff (POST, DELETE admin) | full-text search |
| GET, POST /api/outages, POST /api/outages/:id/resolve | all (resolve staff) | outages |
| GET, POST /api/maintenance, PATCH, DELETE /api/maintenance/:id | staff | maintenance |
| GET /api/meters, GET /api/readings | all (consumers see own) | meter list, usage analytics |
| POST /api/readings | staff | ingest a meter reading |
| GET /api/analytics, GET /api/events, PATCH /api/events/:id | staff | MongoDB aggregations and events |
| GET, POST /api/users, PATCH /api/users/:id | admin | user management |

## Contributions

The ER diagram and relational schema were designed together. The rest was split in half so that each member worked on both a database and the web application.

| Area | Divya Gupta (PES2UG24CS901) | Vidya Sri Ganesh (PES2UG24CS667) |
|---|---|---|
| Database | MySQL: DDL, DML, Level 3 constraints, views, triggers, transactional procedures, SQL test cases | MongoDB: time-series and event collections, validators, indexes, aggregation pipelines, seed script |
| Backend | MySQL pool, validation, error mapping; APIs for allocations, plants, zones, resources, maintenance, dashboard | Authentication (bcrypt, JWT, middleware, roles); APIs for telemetry, readings, meters, events, outages, users |
| Frontend | Control room, allocations, plants and zones, backup resources, maintenance pages | UI shell and shared components; sign-in, registration, telemetry, outages, users, consumer usage pages |
| Documentation | Database sections of the report, SQL test results | README, screenshots, application sections of the report |

## Pushing to GitHub

Repository: https://github.com/divyaguptamo/smart-power-grid. Each member commits their own half from their own account, so the history shows who built what. Use Git Bash on Windows.

1. Divya creates an empty repository named `smart-power-grid` on GitHub (no README, .gitignore or licence).
2. Divya, inside the extracted project folder: `bash git-setup/part1_divya.sh`, then invites Vidya under Settings, Collaborators.
3. Vidya accepts the invite, clones the repository, and from inside the clone runs `bash git-setup/part2_vidya.sh <path to the extracted project folder>`.

Each person's `git config user.email` must be an email on their GitHub account, or the commits will not be linked to their profile.
