#!/usr/bin/env bash
# Copia assets canónicos de docs/design/marca → landing + mobile.
# Tras copiar, endurece la tinta (stipple → opaca) para icon/splash/web marks.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
M="$ROOT/docs/design/marca"
cp -f "$M/ina-igar-huellas-blanco.png" "$ROOT/landing/huellas-blanco.png"
cp -f "$M/ina-igar-huellas-negro.png" "$ROOT/landing/huellas-negro.png"
cp -f "$M/ina-igar-huellas-blanco.png" "$ROOT/mobile/assets/huellas-blanco.png"
cp -f "$M/ina-igar-huellas-negro.png" "$ROOT/mobile/assets/huellas-negro.png"
cp -f "$M/ina-igar-icon.png" "$ROOT/landing/icon.png"
cp -f "$M/ina-igar-splash.png" "$ROOT/landing/splash.png"
cp -f "$M/ina-igar-demo-16x9.png" "$ROOT/landing/og.png"
cp -f "$M/ina-igar-icon.png" "$ROOT/mobile/assets/icon.png"
cp -f "$M/ina-igar-icon.png" "$ROOT/mobile/assets/adaptive-icon.png"
cp -f "$M/ina-igar-splash.png" "$ROOT/mobile/assets/splash-icon.png"
python3 "$ROOT/scripts/harden-huellas.py"
echo "marca → landing + mobile OK"
