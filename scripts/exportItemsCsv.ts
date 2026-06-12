import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_TEMPLATES, tierMinTemplate } from "../src/data/objetTemplates";
import { FACTEUR_ETAT } from "../src/lib/etat";

const SEP = ";";

function esc(v: string | number | boolean): string {
  const s = String(v);
  if (s.includes(SEP) || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const header = [
  "templateId",
  "nom",
  "categorie",
  "rarete",
  "unique",
  "tierMin",
  "prix_Mauvais",
  "prix_Bon",
  "prix_TresBon",
  "prix_PristinEtat",
];

const rareteOrdre: Record<string, number> = { commun: 0, rare: 1, legendaire: 2 };
const tries = [...ALL_TEMPLATES].sort((a, b) => {
  if (a.categorie !== b.categorie) return a.categorie.localeCompare(b.categorie, "fr");
  if (a.rarete !== b.rarete) return rareteOrdre[a.rarete] - rareteOrdre[b.rarete];
  return a.prixRefBase - b.prixRefBase;
});

const lines = [header.join(SEP)];
for (const t of tries) {
  const base = t.prixRefBase;
  lines.push(
    [
      esc(t.templateId),
      esc(t.nom),
      esc(t.categorie),
      esc(t.rarete),
      esc(t.unique ? "oui" : ""),
      esc(t.rarete === "legendaire" ? "" : tierMinTemplate(t.templateId)),
      Math.max(1, Math.round(base * FACTEUR_ETAT.Mauvais)),
      Math.max(1, Math.round(base * FACTEUR_ETAT.Bon)),
      base,
      Math.max(1, Math.round(base * FACTEUR_ETAT["Pristin état"])),
    ].join(SEP),
  );
}

const out = resolve(process.cwd(), "docs/items-catalogue.csv");
const csv = "\uFEFF" + lines.join("\n") + "\n";
writeFileSync(out, csv, "utf8");
console.log(`Écrit ${tries.length} lignes → ${out}`);
