#!/usr/bin/env bash
# Copia assets canónicos de docs/design/marca → landing (+ mobile icons).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
M="$ROOT/docs/design/marca"
cp -f "$M/ina-igar-huellas-blanco.png" "$ROOT/landing/huellas-blanco.png"
cp -f "$M/ina-igar-huellas-negro.png" "$ROOT/landing/huellas-negro.png"
cp -f "$M/ina-igar-icon.png" "$ROOT/landing/icon.png"
cp -f "$M/ina-igar-splash.png" "$ROOT/landing/splash.png"
cp -f "$M/ina-igar-icon.png" "$ROOT/mobile/assets/icon.png"
cp -f "$M/ina-igar-splash.png" "$ROOT/mobile/assets/splash-icon.png"
echo "marca → landing + mobile icons OK"
