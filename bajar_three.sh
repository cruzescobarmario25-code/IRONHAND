#!/bin/sh
# Descarga Three.js a una copia local para que la mano 3D funcione SIN internet.
# Ejecutar UNA vez (con internet), desde la carpeta del proyecto, y luego hacer commit.
set -e
mkdir -p js/vendor
curl -L --fail -o js/vendor/three.module.js \
  https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js
ls -l js/vendor/three.module.js
echo "Listo. Ahora: git add -A && git commit -m 'Three.js local' && git push origin main"
