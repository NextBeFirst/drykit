#!/usr/bin/env bash
# Generate a drykit report for an external repo
# Usage: ./scripts/generate-report.sh <repo-url> <report-name>
# Example: ./scripts/generate-report.sh https://github.com/calcom/cal.com calcom

set -e

REPO_URL="${1:?Usage: $0 <repo-url> <report-name>}"
REPORT_NAME="${2:?Usage: $0 <repo-url> <report-name>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$PROJECT_DIR/reports"
TMP_DIR=$(mktemp -d)

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "==> Cloning $REPO_URL (shallow)..."
git clone --depth 1 "$REPO_URL" "$TMP_DIR/repo" 2>/dev/null

echo "==> Running drykit scan..."
cd "$TMP_DIR/repo"
npx drykit scan 2>/dev/null || true

echo "==> Generating report..."
mkdir -p "$REPORTS_DIR"
npx drykit check --report-file "$REPORTS_DIR/$REPORT_NAME.md" 2>/dev/null || true

echo "==> Done: $REPORTS_DIR/$REPORT_NAME.md"

# Target repos:
# ./scripts/generate-report.sh https://github.com/calcom/cal.com calcom
# ./scripts/generate-report.sh https://github.com/makeplane/plane plane
# ./scripts/generate-report.sh https://github.com/documenso/documenso documenso
# ./scripts/generate-report.sh https://github.com/dubinc/dub dub
# ./scripts/generate-report.sh https://github.com/twentyhq/twenty twenty
