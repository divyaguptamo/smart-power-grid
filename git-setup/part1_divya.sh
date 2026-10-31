#!/usr/bin/env bash
# PART 1 - Divya Gupta (PES2UG24CS901)
# Run from inside the extracted project folder (the one containing package.json):
#   bash git-setup/part1_divya.sh
# Before running: create an EMPTY repository named smart-power-grid on github.com
# (no README, no .gitignore, no licence).
cd "$(dirname "$0")/.."
. git-setup/common.sh

REMOTE="${REMOTE:-https://github.com/divyaguptamo/smart-power-grid.git}"

[ -f package.json ] || { echo "Run this from the project folder."; exit 1; }
[ -d .git ] && { echo "This folder is already a git repository. Use a fresh copy of the project."; exit 1; }

check_identity
git init -q -b main 2>/dev/null || { git init -q; git checkout -q -b main; }

echo "Making Divya's commits..."
commit_paths "Project setup: Next.js config, dependencies, environment template" \
  package.json package-lock.json next.config.mjs jsconfig.json .gitignore .env.example git-setup
commit_paths "MySQL schema: DDL with keys, constraints, indexes and summary view" sql/01_ddl.sql
commit_paths "DML and SQL advanced features: queries, transactions, trigger, procedure, function, full-text" \
  sql/02_dml_and_advanced.sql docs/earlier-submissions
commit_paths "Level 3 SQL: bcrypt check, validation constraints, views, triggers, transactional procedures" \
  sql/03_level3_additions.sql scripts/hash-password.mjs
commit_paths "Database test cases and results" sql/04_test_cases.sql docs/sql-test-results.txt
commit_paths "MySQL connection pool, input validation and database error mapping" \
  lib/db.js lib/validate.js lib/errors.js
commit_paths "APIs for allocations, plants, zones, backup resources, maintenance and dashboard" \
  app/api/allocations app/api/plants app/api/zones app/api/resources app/api/maintenance app/api/dashboard
commit_paths "Operator pages: control room, allocations, plants and zones, resources, maintenance" \
  "app/(console)/dashboard" "app/(console)/allocations" "app/(console)/grid" \
  "app/(console)/resources" "app/(console)/maintenance"

git remote add origin "$REMOTE"
echo
echo "Pushing to $REMOTE (sign in to GitHub if a window or prompt appears)..."
git push -u origin main
echo
echo "Done. Next: on GitHub open the repository, Settings > Collaborators > Add people,"
echo "and invite Vidya. She then runs part2_vidya.sh."
