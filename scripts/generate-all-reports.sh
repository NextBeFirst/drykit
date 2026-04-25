#!/usr/bin/env bash
# Generate drykit reports for all target repos
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Generating reports for 5 repos..."
"$SCRIPT_DIR/generate-report.sh" https://github.com/calcom/cal.com calcom
"$SCRIPT_DIR/generate-report.sh" https://github.com/makeplane/plane plane
"$SCRIPT_DIR/generate-report.sh" https://github.com/documenso/documenso documenso
"$SCRIPT_DIR/generate-report.sh" https://github.com/dubinc/dub dub
"$SCRIPT_DIR/generate-report.sh" https://github.com/twentyhq/twenty twenty

echo "All reports generated in reports/"
