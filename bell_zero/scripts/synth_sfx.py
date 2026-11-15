#!/usr/bin/env python3
"""Procedural placeholder SFX (numpy only). Drop real WAVs with the same names into public/sfx/
and they are used instead (existing files are never overwritten unless --force)."""
import sys, os, wave
import numpy as np

SR = 44100
force = "--force" in sys.argv
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.makedirs("public/sfx", exist_ok=True)
rng = np.random.default_rng(7)
T = lambda d: np.arange(int(SR * d)) / SR


def noise(d): return rng.standard_normal(int(SR * d))


def bandpass(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def env(d, a=0.005, decay=6.0):
    t = T(d); return np.minimum(1, t / a) * np.exp(-t * decay)


def norm(x, peak=0.7):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def save(name, x):
    x = np.clip(norm(x), -1, 1)
    with wave.open(f"public/sfx/{name}.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def gen():
    t = T(1.5)
    buzz = np.sign(np.sin(2 * np.pi * 180 * t)) * 0.5 + np.sin(2 * np.pi * 360 * t) * 0.3
    am = (np.sin(2 * np.pi * 14 * t) > -0.2) * ((t % 0.75) < 0.5)
    yield "phone_ring", buzz * am * np.minimum(1, t * 50)

    t = T(2.2)
    sweep = np.sin(2 * np.pi * np.cumsum(60 + 220 * (t / 2.2) ** 2) / SR)
    yield "riser_low", (sweep * 0.7 + bandpass(noise(2.2), 200, 3000) * 0.25) * (t / 2.2) ** 1.6

    yield "static_burst", bandpass(noise(0.8), 300, 9000) * env(0.8, 0.002, 4) * (1 + 0.5 * np.sin(2 * np.pi * 60 * T(0.8)))

    t = T(0.18)
    yield "ui_pop", np.sin(2 * np.pi * (900 + 1400 * t / 0.18) * t) * env(0.18, 0.002, 22)

    t = T(1.6)
    thump = np.sin(2 * np.pi * (70 - 30 * t) * t) * np.exp(-t * 7)
    ring = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((310, 5), (470, 7), (910, 9))) * 0.2
    yield "door_slam", thump + ring + bandpass(noise(1.6), 100, 2500) * env(1.6, 0.001, 18) * 0.7

    t = T(3.0)
    f = np.where((t % 1.0) < 0.5, 720, 960)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    yield "alarm", (s + 0.35 * np.sign(s)) * np.minimum(1, t * 20)

    out = np.zeros(int(SR * 1.2))
    for k in range(9):
        st = int(rng.uniform(0, 0.55) * SR); tt = T(0.5)
        ping = sum(np.sin(2 * np.pi * rng.uniform(2800, 6500) * tt) * np.exp(-tt * rng.uniform(9, 16)) for _ in range(2))
        out[st:st + len(ping)] += ping * rng.uniform(0.4, 1)
    yield "key_jingle", out

    d = 3.5
    base = bandpass(noise(d), 180, 1400)
    form = 0.55 + 0.45 * np.sin(2 * np.pi * 3.1 * T(d)) * np.sin(2 * np.pi * 1.3 * T(d) + 1)
    yield "crowd_murmur", base * form * np.minimum(1, T(d) * 2)

    out = np.zeros(int(SR * 3.0))
    for beat in range(4):
        for off, fr, amp in ((0, 60, 1.0), (0.17, 52, 0.7)):
            st = int((beat * 0.86 + off) * SR); tt = T(0.3)
            thump = np.sin(2 * np.pi * fr * tt) * np.exp(-tt * 16) * amp
            out[st:st + len(tt)] += thump[: len(out) - st]
    yield "heartbeat", out

    t = T(1.8)
    saw = ((np.cumsum(130 - 40 * t / 1.8) / SR * 1.0) % 1) * 2 - 1
    yield "metal_creak", bandpass(saw, 150, 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t)) * np.sin(np.pi * t / 1.8)

    t = T(6.0)
    yield "ambient_hum", np.sin(2 * np.pi * 50 * t) * 0.5 + np.sin(2 * np.pi * 100 * t) * 0.25 + bandpass(noise(6.0), 40, 400) * 0.3


for name, x in gen():
    p = f"public/sfx/{name}.wav"
    if os.path.exists(p) and not force:
        print("keep  ", p); continue
    save(name, x); print("wrote ", p)
