#!/usr/bin/env python3
"""Step 5a — voiceover for every scene (mandatory: never render a silent video).

Provider order:
  1. ElevenLabs  /v1/text-to-speech/{voice_id}/with-timestamps   (needs ELEVENLABS_API_KEY)
  2. edge-tts    (free fallback, word boundaries from the service; `pip install edge-tts`)

Outputs (public/audio/):
  vo_01.mp3 ...          one file per scene (already tempo-fitted to its scene window)
  vo_full.wav            all VO placed on the episode timeline (mono, 44.1 kHz)  -> lip-sync + mix
  alignment.json         {"scenes": {scene_id: [{"w","s","e"}...]}} absolute episode seconds
  vo_report.json         provider used, raw/fitted durations, tempo factor per scene

Usage:
  python3 scripts/make_audio.py episodes/episode_1.json [--force-edge] [--voice-id ID] [--pad 0.15]
"""
import argparse, asyncio, base64, json, os, re, subprocess, sys, urllib.request, urllib.error

ap = argparse.ArgumentParser()
ap.add_argument("episode")
ap.add_argument("--force-edge", action="store_true", help="skip ElevenLabs, use edge-tts")
ap.add_argument("--voice-id", default=None)
ap.add_argument("--pad", type=float, default=0.15, help="seconds of lead-in after each scene start")
ap.add_argument("--max-tempo", type=float, default=1.18, help="max speed-up used to fit VO in its scene")
ap.add_argument("--out", default="public/audio")
args = ap.parse_args()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
os.makedirs(args.out, exist_ok=True)

ep = json.load(open(args.episode, encoding="utf-8"))
style = json.load(open("bible/style.json", encoding="utf-8"))
vcfg = style["voice"]
voice_id = args.voice_id or os.environ.get("ELEVENLABS_VOICE_ID") or vcfg["voice_id"]
api_key = os.environ.get("ELEVENLABS_API_KEY", "")
use_eleven = bool(api_key) and not args.force_edge and not voice_id.startswith("REPLACE")
if not args.force_edge and not use_eleven:
    why = "no ELEVENLABS_API_KEY" if not api_key else "voice_id not set in bible/style.json (or ELEVENLABS_VOICE_ID)"
    print(f"[audio] ElevenLabs unavailable ({why}) -> edge-tts fallback")


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def duration(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path])
    return float(r.stdout.strip())


def chars_to_words(text, starts, ends):
    """ElevenLabs gives per-character times -> word list."""
    words, cur, s0, e0 = [], "", None, None
    for ch, s, e in zip(text, starts, ends):
        if ch.isspace():
            if cur:
                words.append({"w": cur, "s": s0, "e": e0}); cur, s0 = "", None
            continue
        if s0 is None: s0 = s
        cur += ch; e0 = e
    if cur: words.append({"w": cur, "s": s0, "e": e0})
    # split em-dash glued words ("yard—not") into separate tokens, sharing the time span
    out = []
    for w in words:
        parts = [p for p in re.split(r"[—–]", w["w"]) if p]
        if len(parts) <= 1: out.append(w); continue
        span = (w["e"] - w["s"]) / len(parts)
        for i, p in enumerate(parts):
            out.append({"w": p, "s": w["s"] + i * span, "e": w["s"] + (i + 1) * span})
    return out


def tts_eleven(text, out_mp3):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128"
    body = json.dumps({
        "text": text,
        "model_id": vcfg.get("model_id", "eleven_multilingual_v2"),
        "voice_settings": vcfg["settings"],
    }).encode()
    req = urllib.request.Request(url, data=body, headers={"xi-api-key": api_key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.load(r)
    open(out_mp3, "wb").write(base64.b64decode(d["audio_base64"]))
    al = d.get("alignment") or d.get("normalized_alignment")
    return chars_to_words(text, al["character_start_times_seconds"], al["character_end_times_seconds"])


def tts_edge(text, out_mp3):
    import edge_tts  # noqa: pip install edge-tts

    async def go():
        comm = edge_tts.Communicate(text, vcfg.get("fallback_edge_tts", "en-US-GuyNeural"), rate="-4%", boundary="WordBoundary")
        words = []
        with open(out_mp3, "wb") as f:
            async for ch in comm.stream():
                if ch["type"] == "audio":
                    f.write(ch["data"])
                elif ch["type"] == "WordBoundary":
                    s = ch["offset"] / 1e7
                    words.append({"w": ch["text"], "s": s, "e": s + ch["duration"] / 1e7})
        return words

    return asyncio.run(go())


report, align = {}, {"scenes": {}}
for i, sc in enumerate(ep["scenes"], start=1):
    sid, text = sc["id"], sc["vo"]
    raw = os.path.join(args.out, f"vo_{i:02d}.raw.mp3")
    final = os.path.join(args.out, f"vo_{i:02d}.mp3")
    provider, words = None, None
    if use_eleven:
        try:
            words = tts_eleven(text, raw); provider = "elevenlabs"
        except (urllib.error.URLError, KeyError, ValueError) as e:
            print(f"[audio] {sid}: ElevenLabs failed ({e}) -> edge-tts fallback")
    if words is None:
        words = tts_edge(text, raw); provider = "edge-tts"

    d_raw = duration(raw)
    window = (sc["t"][1] - sc["t"][0]) - args.pad - 0.15
    tempo = 1.0
    if d_raw > window:
        tempo = min(args.max_tempo, d_raw / window)
    if tempo > 1.001:
        run(["ffmpeg", "-y", "-i", raw, "-filter:a", f"atempo={tempo:.4f}", "-b:a", "128k", final])
    else:
        os.replace(raw, final)
    if os.path.exists(raw): os.remove(raw)
    d_fit = duration(final)
    off = sc["t"][0] + args.pad
    align["scenes"][sid] = [
        {"w": w["w"], "s": round(off + w["s"] / tempo, 3), "e": round(off + w["e"] / tempo, 3)} for w in words
    ]
    report[sid] = {"provider": provider, "raw_s": round(d_raw, 2), "tempo": round(tempo, 3), "fitted_s": round(d_fit, 2),
                   "window_s": round(window, 2), "overflow_s": round(max(0.0, d_fit - window), 2)}
    flag = "  <-- STILL TOO LONG: shorten the vo line" if d_fit > window + 0.05 else ""
    print(f"[audio] {sid}: {provider} raw={d_raw:.2f}s tempo={tempo:.2f} -> {d_fit:.2f}s / window {window:.2f}s{flag}")

json.dump(align, open(os.path.join(args.out, "alignment.json"), "w"), indent=1)
json.dump(report, open(os.path.join(args.out, "vo_report.json"), "w"), indent=1)

# ---- place every VO line on the episode timeline -> vo_full.wav (mono 44.1k) ----
total = ep["meta"]["duration_target_s"]
inputs, filt, labels = [], [], []
for i, sc in enumerate(ep["scenes"], start=1):
    inputs += ["-i", os.path.join(args.out, f"vo_{i:02d}.mp3")]
    ms = int((sc["t"][0] + args.pad) * 1000)
    filt.append(f"[{i-1}:a]aresample=44100,aformat=channel_layouts=mono,adelay={ms}:all=1[v{i}]")
    labels.append(f"[v{i}]")
filt.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=longest,apad=whole_dur={total},atrim=0:{total}[out]")
run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]", "-ar", "44100", "-ac", "1",
     os.path.join(args.out, "vo_full.wav")])
print(f"[audio] wrote {args.out}/vo_full.wav ({total}s), alignment.json, vo_report.json")
