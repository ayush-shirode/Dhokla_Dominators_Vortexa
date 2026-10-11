#!/usr/bin/env bash
# Downloads optional local assets for the API:
#  - Tesseract "fast" models (eng + hin) for on-server OCR and Aadhaar masking (no third-party calls)
#  - Noto Sans + Noto Sans Devanagari fonts for English/Hindi PDF export
# Safe to re-run; skips files that already exist.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p tessdata assets/fonts

fetch() { # url dest
  if [ -s "$2" ]; then echo "✓ $2 (exists)"; return; fi
  echo "↓ $2"; curl -fsSL --retry 3 -o "$2.part" "$1" && mv "$2.part" "$2"
}

for lang in eng hin; do
  fetch "https://github.com/tesseract-ocr/tessdata_fast/raw/main/${lang}.traineddata" "tessdata/${lang}.traineddata"
done

NOTO=https://github.com/notofonts/notofonts.github.io/raw/main/fonts
for f in NotoSans-Regular NotoSans-Bold; do
  if [ -s "/usr/share/fonts/noto/$f.ttf" ] && [ ! -s "assets/fonts/$f.ttf" ]; then cp "/usr/share/fonts/noto/$f.ttf" assets/fonts/; fi
  fetch "$NOTO/NotoSans/hinted/ttf/$f.ttf" "assets/fonts/$f.ttf"
done
for f in NotoSansDevanagari-Regular NotoSansDevanagari-Bold; do
  if [ -s "/usr/share/fonts/noto/$f.ttf" ] && [ ! -s "assets/fonts/$f.ttf" ]; then cp "/usr/share/fonts/noto/$f.ttf" assets/fonts/; fi
  fetch "$NOTO/NotoSansDevanagari/hinted/ttf/$f.ttf" "assets/fonts/$f.ttf"
done

if command -v tesseract >/dev/null; then
  echo "tesseract: $(tesseract --version 2>&1 | head -1)"
else
  echo "⚠ tesseract binary not found — install it (e.g. apt install tesseract-ocr) to enable local OCR + Aadhaar masking."
fi
