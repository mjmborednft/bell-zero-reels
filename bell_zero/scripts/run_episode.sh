#!/usr/bin/env bash
# Full pipeline for one episode.
# Usage: bash scripts/run_episode.sh <N> [--force-edge]
# Env:   ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID (or set voice_id in bible/style.json)
set -euo pipefail
cd "$(dirname "$0")/.."
N="${1:-1}"; shift || true
EP="episodes/episode_${N}.json"

python3 scripts/validate.py "$EP"          # 1. contract + bible check
bash scripts/prepare.sh "$N"               # 2. episode + bible -> public/
python3 scripts/synth_sfx.py               # 3. placeholder SFX (real WAVs in public/sfx win)
python3 scripts/make_audio.py "$EP" "$@"   # 4. VO + word alignment + vo_full.wav
python3 scripts/mix_audio.py "$EP"         # 5. final mix
node scripts/qa_sheet.mjs "$N"             # 6. QA contact sheet (look at it before the render)
node scripts/render.mjs "$N"               # 7. out/BELL_ZERO_E0N.mp4
