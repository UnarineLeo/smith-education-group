#!/bin/sh
set -eu

project_directory=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
pdf_directory="$project_directory/src/assets/prospectus"
markdown_directory="$project_directory/src/assets/markdown"
staging_directory=$(mktemp -d "${TMPDIR:-/tmp}/unipply-markdown.XXXXXX")

cleanup() {
  rm -rf "$staging_directory"
}
trap cleanup EXIT INT TERM

osascript -l JavaScript \
  "$project_directory/scripts/convert-prospectuses-to-markdown.jxa" \
  "$pdf_directory" \
  "$staging_directory"

node "$project_directory/scripts/complete-prospectus-ocr.cjs" "$staging_directory"

pdf_count=$(find "$pdf_directory" -maxdepth 1 -type f -name '*_prospectus*.pdf' | wc -l | tr -d ' ')
markdown_count=$(find "$staging_directory" -maxdepth 1 -type f -name '*_prospectus.md' | wc -l | tr -d ' ')

if [ "$pdf_count" -ne "$markdown_count" ]; then
  echo "Expected $pdf_count markdown files but generated $markdown_count" >&2
  exit 1
fi

for markdown_file in "$staging_directory"/*_prospectus.md; do
  if [ ! -s "$markdown_file" ]; then
    echo "Generated file is empty: $markdown_file" >&2
    exit 1
  fi
  if grep -q 'OCR_PENDING' "$markdown_file"; then
    echo "OCR placeholder remains in: $markdown_file" >&2
    exit 1
  fi
done

for markdown_file in "$staging_directory"/*_prospectus.md; do
  cp "$markdown_file" "$markdown_directory/$(basename "$markdown_file")"
done

echo "Overwrote $markdown_count markdown prospectuses in $markdown_directory"
