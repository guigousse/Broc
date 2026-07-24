#!/usr/bin/env bash
# Charge une partie de DÉMO (niveau 75, ~1/4 collection, stand garni) dans le
# webview d'un simulateur, pour les captures App Store.
#
# Comment : régénère scripts/save-demo.json (via gen-save-demo.ts), injecte un
# petit script d'amorçage dans out/index.html qui écrit la save dans le
# localStorage du webview au 1er chargement puis recharge, et relance l'app.
# La save persiste ensuite dans le localStorage du simu (l'injection peut être
# retirée). Sert l'export statique out/ sur :3000 si besoin (cf. ios-sim.sh).
#
# Pré-requis : `npm run build` fait au moins une fois (out/ présent), et le
# .app installé sur le simu (./scripts/ios-sim.sh une fois).
#
# Usage : ./scripts/seed-demo-sim.sh ["Nom du simulateur"]   (défaut iPhone 16 Pro)
set -euo pipefail
cd "$(dirname "$0")/.."

SIM="${1:-iPhone 16 Pro}"
BUNDLE_ID="com.guigousse.broc"

[ -f out/index.html ] || { echo "❌ out/ absent — lance d'abord : npm run build"; exit 1; }

echo "🧱 Génération de la save de démo…"
npx tsx scripts/gen-save-demo.ts > scripts/save-demo.json

echo "💉 Injection de l'amorçage dans out/index.html…"
SAVE_JSON="scripts/save-demo.json" python3 - <<'PY'
import json, os, re
save = open(os.environ["SAVE_JSON"]).read()
json.loads(save)  # valide
NOW = 1753005600000
index = json.dumps({"actif":1,"slots":{"1":{"nom":"Démo App Store","derniereSession":NOW},"2":None,"3":None}})
seed = ("<script>(function(){try{"
        "if(sessionStorage.getItem('broc-demo-seeded')==='1')return;"
        "var s=" + json.dumps(save) + ";"
        "localStorage.setItem('projet-broc:slot:1:v1',s);"
        "localStorage.setItem('projet-broc:slot:1:v1:backup',s);"
        "localStorage.setItem('projet-broc:slots:v1'," + json.dumps(index) + ");"
        "sessionStorage.setItem('broc-demo-seeded','1');"
        "location.reload();"
        "}catch(e){}})();</script>")
p="out/index.html"; html=open(p).read()
# Retire une éventuelle injection précédente puis ré-injecte (idempotent).
html=re.sub(r"<script>\(function\(\)\{try\{if\(sessionStorage\.getItem\('broc-demo-seeded'\).*?\}\)\(\);</script>","",html)
html=html.replace("</head>", seed+"</head>", 1)
open(p,"w").write(html)
print("   save=%d o injectée" % len(save))
PY

# Serveur statique sur :3000 si rien n'écoute.
if ! curl -s -o /dev/null --max-time 2 http://localhost:3000; then
  echo "▶︎ Serveur statique out/ (:3000)…"
  ( npx serve out -l 3000 > /tmp/serve-out.log 2>&1 & )
  until curl -s -o /dev/null --max-time 2 http://localhost:3000; do sleep 1; done
fi

echo "📲 Relance sur « $SIM »…"
open -a Simulator || true
xcrun simctl boot "$SIM" 2>/dev/null || true
xcrun simctl bootstatus "$SIM" -b >/dev/null 2>&1 || true
xcrun simctl terminate "$SIM" "$BUNDLE_ID" 2>/dev/null || true
xcrun simctl launch "$SIM" "$BUNDLE_ID"
echo "🚀 Partie de démo chargée (N75, ~1/4 collection). Recharge une fois pour l'amorçage."
echo "   Capture :  xcrun simctl io \"$SIM\" screenshot ~/Desktop/broc-XX.png"
