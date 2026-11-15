# BELL ZERO — движок анимированных reels (Remotion, contract v3)

Формат 1080×1920, 30 fps. Один `episode_N.json` → готовый MP4 с озвучкой, SFX, HUD,
кинетическими субтитрами, финальным опросом и тизером. Менять код под новый эпизод не нужно.

## Запуск (облако / Docker)
```bash
docker build -t bellzero .
docker run --rm -e ELEVENLABS_API_KEY=... -e ELEVENLABS_VOICE_ID=... \
  -v "$PWD/out:/app/out" bellzero            # эпизод 1
docker run --rm ... bellzero bash scripts/run_episode.sh 2   # эпизод 2
```
Без ключа ElevenLabs озвучка автоматически идёт через `edge-tts` (`--force-edge` — принудительно).
Локально: `npm i && pip install numpy edge-tts && bash scripts/run_episode.sh 1`.

## Конвейер (`scripts/run_episode.sh`)
1. `validate.py` — контракт v3, риги/фоны из bible, непрерывность сцен, события внутри окон сцен, оценка длины VO.
2. `prepare.sh` — копирует эпизод и bible в `public/`.
3. `synth_sfx.py` — процедурные SFX-заглушки. Положите свои `public/sfx/<id>.wav` — они приоритетнее.
4. `make_audio.py` — VO по сценам (ElevenLabs `with-timestamps`), подгонка темпа ≤1.18×, `alignment.json` (тайминги слов), `vo_full.wav`.
5. `mix_audio.py` — VO −14 LUFS, SFX −6 дБ с сайдчейн-дакингом, фоновый гул, лимитер → `mix.wav`.
6. `qa_sheet.mjs` — контакт-лист 3×3 → `out/qa_sheet.jpg`. **Смотрите его до рендера.**
7. `render.mjs` — H.264 CRF 18 + AAC → `out/BELL_ZERO_E01.mp4`. Без `mix.wav` рендер отказывается стартовать.

## Структура
- `bible/characters.json, backgrounds.json, style.json` — каноны (v3). В `style.json` пропишите `voice.voice_id`.
- `src/CharacterRig.tsx` — риг: ~35 слоёв, 2-сегментные руки, пальцы, моргание, дрожь страха, липсинк по амплитуде `vo_full.wav`.
- `src/WorldEngine.tsx` — `classroom_interior`, `classroom_door_view`: 4 слоя глубины, параллакс, живые экраны (радар, осциллограф, CCTV, замок).
- `src/LightingLayer.tsx` — пресеты света, объёмные конусы, туман, частицы, пульс тревоги, виньетка, зерно.
- `src/HUD.tsx, Subtitles.tsx, EndingStack.tsx` — HUD (1 с эпизода = 1 мин мир-времени: 14:15 → 14:37 к 22 с), субтитры 1–3 слова, финал.
- Safe zones: верх 150 px, низ 460 px; субтитры на y≈1250–1450.

## Новый эпизод / персонаж / локация
- Эпизод: `episodes/episode_N.json` → `bash scripts/run_episode.sh N`.
- Персонаж: добавьте в `bible/characters.json`. Палитра берётся из bible; для новых рига-типов добавьте ветку в `lookFor()` и масштаб в `src/layout.ts`.
- Локация: новый `bg` — компонент в `WorldEngine.tsx` с теми же 4 слоями.

## Предпросмотр без браузера
`tools/svg_preview` рендерит SVG-часть (мир + персонажи + свет, без HUD/субтитров) в PNG через resvg — быстрая проверка рига.
