#!/usr/bin/env bash

OUT="project_dump.txt"

# remove old output
rm -f "$OUT"

# find all relevant files (adjust as needed)
find . \
  -type d \( -name ".git" -o -name "node_modules" -o -name "dist" -o -name "build" \) -prune -false -o \
  -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.json" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" -o -name "*.sh" \) \
  | while read -r file; do
    echo "===== FILE: $file =====" >> "$OUT"
    cat "$file" >> "$OUT"
    echo -e "\n" >> "$OUT"
  done
