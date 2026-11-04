#!/bin/bash
BASE=http://localhost:3000
curl -s -c /tmp/grid.cookie -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"arjun@gmail.com","password":"Grid@2026"}' \
  -o /dev/null -w "login: %{http_code}\n"
cd app/api
find . -name route.js | sed 's|^\./||; s|/route.js$||' | grep -v '\[' | grep -v '^auth' | sort | while read p; do
  code=$(curl -s -b /tmp/grid.cookie -o /dev/null -w "%{http_code}" "$BASE/api/$p")
  echo "$code  /api/$p"
done
