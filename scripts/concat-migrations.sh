#!/usr/bin/env bash
# Concatenates all migrations into a single SQL file ready to paste into
# the Supabase Dashboard SQL Editor of a fresh project.
#
# Usage:
#   ./scripts/concat-migrations.sh > all-migrations.sql
#
# Then paste the contents of all-migrations.sql into your dev project's
# SQL Editor and run.

set -euo pipefail
cd "$(dirname "$0")/.."

for f in $(ls supabase/migrations/*.sql | sort); do
  echo ""
  echo "-- ============================================================"
  echo "-- File: $(basename "$f")"
  echo "-- ============================================================"
  cat "$f"
  echo ""
done

# Also append the seed file at the end (optional — comment the line out
# in the concatenated output if you don't want demo recipes).
if [ -f supabase/seed.sql ]; then
  echo ""
  echo "-- ============================================================"
  echo "-- File: seed.sql (optional, demo data)"
  echo "-- ============================================================"
  cat supabase/seed.sql
fi
