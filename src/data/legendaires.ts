import type { ObjetTemplate } from "@/data/objetTemplates";

/**
 * Templates légendaires inspirés du réel. 1 par catégorie pour la Phase 1.
 * Ces objets ont une probabilité de tirage très faible (~2 %).
 */
export const LEGENDAIRES: ObjetTemplate[] = [
  { templateId: "leg.mus.stradivarius", nom: "Violon Stradivarius (1715)", categorie: "Musique", rarete: "legendaire", prixRefBase: 4500 },
  { templateId: "leg.jx.cartouche_stadium_events", nom: "Cartouche NES 'Stadium Events'", categorie: "Jeux & Loisirs", rarete: "legendaire", prixRefBase: 3800 },
  { templateId: "leg.lv.miserables_originale", nom: "Édition originale 'Les Misérables' (1862)", categorie: "Livres & Papeterie", rarete: "legendaire", prixRefBase: 2200 },
  { templateId: "leg.mo.robe_chanel_1925", nom: "Robe Chanel n°5 originale (1925)", categorie: "Mode", rarete: "legendaire", prixRefBase: 3000 },
  { templateId: "leg.ma.oeuf_faberge", nom: "Œuf de Fabergé (réplique impériale)", categorie: "Maison", rarete: "legendaire", prixRefBase: 5500 },
  { templateId: "leg.br.scie_japonaise_edo", nom: "Scie japonaise période Edo", categorie: "Bricolage", rarete: "legendaire", prixRefBase: 800 },
];
