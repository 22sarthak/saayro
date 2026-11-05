#!/usr/bin/env bash
# Re-encodes landing hero clips from raw drops in assets-raw/hero-video (Pexels, Pexels License).
# Output: apps/web/public/hero/<slug>-{1080,720}.mp4 and <slug>-poster.jpg
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/assets-raw/hero-video"
OUT="$ROOT/apps/web/public/hero"
mkdir -p "$OUT"

GRADE="eq=saturation=1.06:contrast=1.03,colorbalance=rm=0.03:bm=-0.03"

encode() {
  local id="$1" slug="$2" start="$3"
  local src
  src="$(ls "$SRC"/"$id"*.mp4 | head -1)"
  ffmpeg -v error -y -ss "$start" -t 5 -i "$src" -an \
    -vf "fps=30,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,$GRADE" \
    -c:v libx264 -preset slow -crf 28 -maxrate 4M -bufsize 8M -pix_fmt yuv420p -movflags +faststart "$OUT/$slug-1080.mp4"
  ffmpeg -v error -y -ss "$start" -t 5 -i "$src" -an \
    -vf "fps=30,scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,$GRADE" \
    -c:v libx264 -preset slow -crf 29 -maxrate 1.6M -bufsize 3.2M -pix_fmt yuv420p -movflags +faststart "$OUT/$slug-720.mp4"
  ffmpeg -v error -y -ss 0.2 -i "$OUT/$slug-1080.mp4" -frames:v 1 -vf "scale=1600:-1" -q:v 5 "$OUT/$slug-poster.jpg"
  echo "$slug"
}

encode 12069166 goa-coast 4
encode 18983877 jaipur-amber 8
encode 3563081 shimla-rail 5
encode 20225590 himalaya-valley 6
encode 2826350 delhi-safdarjung 10
encode 10307864 amritsar-night 2
