#!/usr/bin/env python3
"""Step 5b — final mix -> public/audio/mix.wav (48 kHz stereo).
VO normalised to -14 LUFS; SFX at style.mix.sfx_db and sidechain-ducked under the voice;
a quiet looped ambient bed underneath. SFX files come from public/sfx/<id>.wav (synthesise
placeholders with scripts/synth_sfx.py, or drop in real ones)."""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ep = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "episodes/episode_1.json", encoding="utf-8"))
mx = json.load(open("bible/style.json", encoding="utf-8"))["mix"]
total = ep["meta"]["duration_target_s"]

events = [(x["t"], x["id"]) for s in ep["scenes"] for x in s["sfx"]]
missing = sorted({i for _, i in events if not os.path.exists(f"public/sfx/{i}.wav")})
if missing:
    sys.exit(f"missing SFX files in public/sfx: {missing} — run scripts/synth_sfx.py or add them")
if not os.path.exists("public/audio/vo_full.wav"):
    sys.exit("public/audio/vo_full.wav not found — run scripts/make_audio.py first")

inputs = ["-i", "public/audio/vo_full.wav"]
filt = [f"[0:a]loudnorm=I={mx['vo_lufs']}:TP=-1.5:LRA=9,aresample=48000,aformat=channel_layouts=stereo,asplit=2[vo][vosc]"]
for k, (t, i) in enumerate(events, start=1):
    inputs += ["-i", f"public/sfx/{i}.wav"]
    filt.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(t*1000)}:all=1,volume={mx['sfx_db']}dB[s{k}]")
amb = len(events) + 1
inputs += ["-stream_loop", "-1", "-i", "public/sfx/ambient_hum.wav"]
filt.append(f"[{amb}:a]aresample=48000,aformat=channel_layouts=stereo,volume={mx['ambient_db']}dB,atrim=0:{total}[amb]")
filt.append("".join(f"[s{k}]" for k in range(1, len(events) + 1)) + f"amix=inputs={len(events)}:normalize=0:duration=longest,apad=whole_dur={total},atrim=0:{total}[sfxraw]")
filt.append("[sfxraw][vosc]sidechaincompress=threshold=0.02:ratio=6:attack=8:release=280:makeup=1[sfxduck]")
filt.append(f"[vo][sfxduck][amb]amix=inputs=3:normalize=0:duration=first,apad=whole_dur={total},atrim=0:{total},alimiter=limit=0.95[out]")
cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]", "-ar", "48000", "-ac", "2", "public/audio/mix.wav"]
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode:
    sys.exit(r.stderr[-1500:])
print(f"[mix] wrote public/audio/mix.wav  ({len(events)} sfx events, ambient bed, VO {mx['vo_lufs']} LUFS)")
