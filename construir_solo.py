import base64, sys, shutil
from pathlib import Path
r = Path.home() / "Project_IRONHAND"
t = r / "js/vendor/three.module.js"
if not t.exists() or t.stat().st_size < 100000: sys.exit("Falta three.module.js: corre sh bajar_three.sh")
h = (r / "index.html").read_text(encoding="utf-8")
a = (r / "js/arm/arm.js").read_text(encoding="utf-8")
tag = '<script type="module" src="./js/arm/arm.js"></script>'
old = 'THREE = await import("../vendor/three.module.js");'
if tag not in h or old not in a: sys.exit("index.html o arm.js no coinciden")
new = ('THREE = window.IRONHAND_THREE_B64 ? await import(URL.createObjectURL(new Blob('
       '[Uint8Array.from(atob(window.IRONHAND_THREE_B64), c => c.charCodeAt(0))], '
       '{type:"text/javascript"}))) : await import("../vendor/three.module.js");')
a = a.replace(old, new)
b = base64.b64encode(t.read_bytes()).decode()
e = '<script>window.IRONHAND_THREE_B64="' + b + '";</script>\n<script>\n(function(){\n' + a + '\n})();\n</script>'
o = r / "IRONHAND_SOLO.html"
o.write_text(h.replace(tag, e), encoding="utf-8")
print("Listo:", o, round(o.stat().st_size / 1e6, 2), "MB")
d = Path.home() / "storage/downloads"
if d.is_dir(): shutil.copy(o, d / o.name); print("Copia en Descargas:", d / o.name)
