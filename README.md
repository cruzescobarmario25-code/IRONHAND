# IRONHAND

Presentación web + simulación EMG + mano/brazo 3D (Three.js).

## Qué hace
- **Simulación EMG** (diap. 10): señal cruda → rectificación → envolvente → umbral con histéresis → orden.
- **Integración EMG → mano** (diap. 13): la orden cierra/abre los dedos del modelo 3D.
  Control EMG o manual, 3 modos de agarre (puño, cilíndrico, pinza), RESET y parada de EMERGENCIA.
- **System Diagnostics** (diap. 9): estados calculados con pruebas reales al cargar la página.
- **Limitaciones** (diap. 14): qué es simulado y qué no.

## Ejecutar en local (Termux)
```bash
python -m http.server 8765
```
Abrir `http://127.0.0.1:8765/`. No abrir `index.html` con doble clic: los módulos JS requieren servidor.

## Three.js sin internet
`js/arm/arm.js` busca primero `js/vendor/three.module.js` y, si no existe, usa el CDN (jsDelivr).
Para tener copia local, con internet, una vez: `sh bajar_three.sh` y subir el archivo a GitHub.

## Publicar
GitHub → Settings → Pages → Deploy from a branch → `main` / `(root)`.

## Alcance
La señal EMG es **simulada**; la mano es un modelo cinemático 3D. No hay sensores ni actuadores reales
ni validación clínica.
