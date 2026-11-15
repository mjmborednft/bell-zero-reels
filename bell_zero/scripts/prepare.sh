#!/usr/bin/env bash
# Copy the active episode + bible into public/ so the Remotion bundle can fetch them.
# Usage: bash scripts/prepare.sh <episode-number>
set -euo pipefail
N="${1:-1}"
cd "$(dirname "$0")/.."
mkdir -p public/bible public/audio public/sfx out
cp "episodes/episode_${N}.json" public/episode.json
cp bible/characters.json bible/backgrounds.json bible/style.json public/bible/
echo "prepared episode ${N}"
