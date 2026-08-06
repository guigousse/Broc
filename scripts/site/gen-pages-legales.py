#!/usr/bin/env python3
"""Régénère site/privacy.html et site/mentions-legales.html depuis le build.

À lancer après `npm run build` (export statique dans out/), depuis la racine :
    python3 scripts/site/gen-pages-legales.py
Extrait le <main> autonome de chaque page (styles inline, aucun script Next)
et l'enveloppe dans une coquille statique minimale. Le lien « Retour au jeu »
devient « Retour à l'accueil » (sur le site, « / » est la vitrine, pas le jeu)
et le contact public du site est broc.le.jeu@gmail.com (l'app garde le sien).
"""
import pathlib
import re

REPO = pathlib.Path(__file__).resolve().parents[2]
SUBS = [
    ("pepite.admin@gmail.com", "broc.le.jeu@gmail.com"),
    ("Retour au jeu", "Retour à l’accueil"),
    ("Back to the game", "Back to the home page"),
    ("Volver al juego", "Volver al inicio"),
    ("Επιστροφή στο παιχνίδι", "Επιστροφή στην αρχική"),
]
SHELL = """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="stylesheet" href="/assets/fonts.css">
  <style>
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; background: #f3ead8; }}
    a {{ color: #6b5a2e; }}
  </style>
</head>
<body>
{main}
</body>
</html>
"""

for src, dst, title in [
    ("out/privacy.html", "site/privacy.html", "Politique de confidentialité — Broc"),
    ("out/mentions-legales.html", "site/mentions-legales.html", "Mentions légales — Broc"),
]:
    html = (REPO / src).read_text()
    main = re.search(r"<main.*?</main>", html, re.S).group(0)
    assert "<script" not in main, f"{src} : le <main> ne doit embarquer aucun script"
    for a, b in SUBS:
        main = main.replace(a, b)
    (REPO / dst).write_text(SHELL.format(title=title, main=main))
    print(dst, "régénéré")
