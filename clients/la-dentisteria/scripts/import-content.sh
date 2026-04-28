#!/usr/bin/env bash
# Imports La Dentisteria content from Markdown into WordPress via WP CLI.
#
# Prerequisites:
# - Local by Flywheel WP site running at https://ladentisteria.local
# - Theme symlinked into wp-content/themes/ladentisteria
# - Theme activated, "servicio" CPT registered (rewrite flushed)
# - WP CLI in PATH (Local includes it)
#
# Usage: from repo root, run:
#   bash clients/la-dentisteria/scripts/import-content.sh

set -euo pipefail

# Adjust if Local site path differs
WP_PATH="${WP_PATH:-$HOME/Local Sites/la-dentisteria/app/public}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICIOS_DIR="$SCRIPT_DIR/../content/servicios"
PAGES_DIR="$SCRIPT_DIR/../content/pages"

if [ ! -d "$WP_PATH" ]; then
  echo "ERROR: WordPress path not found: $WP_PATH"
  echo "Set WP_PATH env var to your Local site's app/public directory."
  exit 1
fi

cd "$WP_PATH"

# Helper: extract a frontmatter field from a Markdown file
get_field() {
  local field="$1"
  local file="$2"
  grep "^${field}:" "$file" | head -1 | sed "s/^${field}:[[:space:]]*//" | sed 's/^"//;s/"$//'
}

# Helper: extract body (everything after the second --- delimiter)
get_body() {
  local file="$1"
  awk '/^---$/{n++; next} n==2{flag=1} flag' "$file"
}

# Import services (CPT)
echo "Importing servicios..."
for md_file in "$SERVICIOS_DIR"/*.md; do
  [ -f "$md_file" ] || continue

  title=$(get_field "title" "$md_file")
  slug=$(get_field "slug" "$md_file")
  excerpt=$(get_field "excerpt" "$md_file")
  order=$(get_field "order" "$md_file")
  body=$(get_body "$md_file")

  # Check if post already exists
  existing_id=$(wp post list --post_type=servicio --name="$slug" --field=ID 2>/dev/null | head -1 || true)

  if [ -n "$existing_id" ]; then
    echo "  Updating existing servicio: $slug (id=$existing_id)"
    wp post update "$existing_id" \
      --post_title="$title" \
      --post_excerpt="$excerpt" \
      --menu_order="$order" \
      --post_content="$body" \
      --post_status=publish
  else
    echo "  Creating new servicio: $slug"
    wp post create \
      --post_type=servicio \
      --post_status=publish \
      --post_title="$title" \
      --post_name="$slug" \
      --post_excerpt="$excerpt" \
      --menu_order="$order" \
      --post_content="$body"
  fi
done

# Import pages
echo "Importing pages..."
for md_file in "$PAGES_DIR"/*.md; do
  [ -f "$md_file" ] || continue

  title=$(get_field "title" "$md_file")
  slug=$(get_field "slug" "$md_file")
  excerpt=$(get_field "excerpt" "$md_file")
  body=$(get_body "$md_file")

  existing_id=$(wp post list --post_type=page --name="$slug" --field=ID 2>/dev/null | head -1 || true)

  if [ -n "$existing_id" ]; then
    echo "  Updating existing page: $slug (id=$existing_id)"
    wp post update "$existing_id" \
      --post_title="$title" \
      --post_excerpt="$excerpt" \
      --post_content="$body" \
      --post_status=publish
  else
    echo "  Creating new page: $slug"
    wp post create \
      --post_type=page \
      --post_status=publish \
      --post_title="$title" \
      --post_name="$slug" \
      --post_excerpt="$excerpt" \
      --post_content="$body"
  fi
done

echo ""
echo "Done. Imported $(ls "$SERVICIOS_DIR"/*.md 2>/dev/null | wc -l) servicios, $(ls "$PAGES_DIR"/*.md 2>/dev/null | wc -l) pages."
echo "Verify at https://ladentisteria.local/servicios/ and https://ladentisteria.local/nosotros/"
