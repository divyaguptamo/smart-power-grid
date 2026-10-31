#!/usr/bin/env bash
# PART 2 - Vidya Sri Ganesh (PES2UG24CS667)
# Run AFTER Divya has pushed part 1 and invited you as a collaborator.
#   1. Accept the invitation (email or github.com/notifications).
#   2. git clone https://github.com/divyaguptamo/smart-power-grid.git
#   3. cd smart-power-grid
#   4. bash git-setup/part2_vidya.sh /path/to/extracted/project-folder
#      (the folder from the zip that contains package.json and app/)
set -e
SRC="$1"
[ -n "$SRC" ] && [ -f "$SRC/package.json" ] && [ -d "$SRC/app" ] || {
  echo "Give the path to the extracted project folder, e.g.:"
  echo "  bash git-setup/part2_vidya.sh ~/Downloads/smart-grid"
  exit 1
}
SRC="$(cd "$SRC" && pwd)"
cd "$(dirname "$0")/.."
[ -d .git ] || { echo "Run this inside your clone of the GitHub repository."; exit 1; }
. git-setup/common.sh

check_identity
git pull -q

# copy one or more paths from the project folder into this repository
bring() {
  for p in "$@"; do
    mkdir -p "$(dirname "$p")"
    rm -rf "$p"
    cp -R "$SRC/$p" "$p"
  done
}

echo "Making Vidya's commits..."
bring lib/session.js lib/auth.js middleware.js app/api/auth app/api/me
commit_paths "Authentication: bcrypt sign-in, signed JWT sessions, role-based middleware" \
  lib/session.js lib/auth.js middleware.js app/api/auth app/api/me

bring lib/mongo.js lib/telemetry.js scripts/seed-mongo.mjs
commit_paths "MongoDB telemetry store: time-series readings, grid events, validators, indexes, seed" \
  lib/mongo.js lib/telemetry.js scripts/seed-mongo.mjs

bring app/api/readings app/api/meters app/api/analytics app/api/events
commit_paths "Telemetry APIs: meter readings, usage and analytics aggregation pipelines, grid events" \
  app/api/readings app/api/meters app/api/analytics app/api/events

bring app/api/outages app/api/users
commit_paths "Outage reporting and resolution, user management APIs" app/api/outages app/api/users

bring app/globals.css app/layout.js app/page.js "app/(console)/layout.js" components
commit_paths "UI shell, styles and shared components (navigation, tags, charts, forms)" \
  app/globals.css app/layout.js app/page.js "app/(console)/layout.js" components

bring app/login app/register "app/(console)/analytics" "app/(console)/outages" \
  "app/(console)/users" "app/(console)/my-usage"
commit_paths "Pages: sign-in, registration, telemetry, outages, users, consumer usage" \
  app/login app/register "app/(console)/analytics" "app/(console)/outages" \
  "app/(console)/users" "app/(console)/my-usage"

bring README.md docs/screenshots
commit_paths "README with setup steps, API overview and screenshots" README.md docs/screenshots

echo
echo "Pushing..."
git push
echo
echo "Done. The repository now builds: npm install, then npm run dev."
