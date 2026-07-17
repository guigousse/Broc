# SP3 — Contenu narratif de la trame : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer le contenu définitif de la trame : textes français finaux des 12 chapitres (dialogues + carnet), invitations, lettre de Maman ajustée, épilogue cartes postales, overlays i18n EN/ES complets, nettoyages reportés et équilibrage final.

**Architecture:** SP2 a livré toute la mécanique — SP3 est une passe de DONNÉES : les textes FR définitifs sont fournis VERBATIM dans ce plan (voix d'auteur unique, à transcrire sans réécrire), les overlays EN/ES sont des traductions littéraires de ces textes, la seule mécanique nouvelle est l'injection des cartes postales dans `tickQuetes` (aujourd'hui passthrough). Branche `feat/sp3-trame-contenu` empilée sur `feat/sp2-trame-mecanique`.

**Tech Stack:** TypeScript strict, Next.js, vitest. Aucune dépendance nouvelle.

## Global Constraints

- **Textes FR de ce plan = VERBATIM.** Ils remplacent les provisoires ; retirer les commentaires `// SP3 : texte provisoire` au passage. Ne pas « améliorer » la prose — toute réserve se signale en concern, pas en réécriture.
- **Ton** (spec) : doux et nostalgique ; il enseigne par les souvenirs, encourage, s'émerveille. Taquin possible (humeur `rieur`), jamais sarcastique. Le grand-père se prénomme **Marcel** — le prénom n'apparaît que dans la lettre de Maman, jamais en interface (l'expéditeur reste « Grand-père »).
- **Règle d'or i18n** : ids stables, jamais de chaîne localisée en save. Overlays EN/ES résolus à l'affichage, fallback payload FR. Le NOMBRE de paragraphes des overlays suit le FR (mise en page des lettres).
- **Humeurs** : `"souriant" | "emu" | "songeur" | "rieur"` (union `HumeurPnj`).
- Les `**gras**` dans les corps sont rendus par les sheets — conserver le balisage.
- Vérifs par tâche : `npx vitest run <fichiers>`, `npx tsc --noEmit`, `npx eslint <fichiers touchés>` (⚠ pas `npm run lint`). Commits en français + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Textes définitifs — Acte I (chapitres 1-4)

**Files:**
- Modify: `src/data/quetesPrincipales.ts` (blocs `trame_ch1` à `trame_ch4` : champs `dialogue` et `payload.corps` uniquement — ids, objectifs, cibles, récompenses, `invitationTier` INCHANGÉS)
- Test: `src/data/quetesPrincipales.test.ts`

**Interfaces:**
- Consumes: types existants (`DialogueLigne`, `ChapitrePrincipal`).
- Produces: textes FR canoniques consommés par les overlays EN/ES (Tasks 7-8) — NE PAS en dévier.

- [ ] **Step 1: Test qui échoue** — ajouter à `quetesPrincipales.test.ts` :

```ts
it("plus aucun texte provisoire dans l'arc", async () => {
  const fs = await import("node:fs/promises");
  const src = await fs.readFile("src/data/quetesPrincipales.ts", "utf8");
  expect(src).not.toContain("SP3 : texte provisoire");
});
it("chaque chapitre a un dialogue de 2 à 5 lignes et un corps de 2 paragraphes min", () => {
  for (const c of QUETES_PRINCIPALES) {
    expect(c.dialogue.length).toBeGreaterThanOrEqual(2);
    expect(c.dialogue.length).toBeLessThanOrEqual(5);
    expect(c.payload.corps.length).toBeGreaterThanOrEqual(2);
  }
});
```

(Le premier test ne passera qu'à la Task 3 — le poser dès maintenant avec `it.skip` + commentaire `// SP3 Task 3 : activé quand les 12 chapitres sont écrits`, l'activer en Task 3.)

- [ ] **Step 2: Remplacer les textes des ch1-4** (dialogue + corps, VERBATIM) :

**trame_ch1 — La lampe de mon atelier**
```ts
dialogue: [
  { humeur: "songeur", texte: "Quarante ans que ma vieille lampe à pétrole a éclairé l'établi. Je l'ai cassée un soir de maladresse… mes mains, déjà." },
  { humeur: "emu", texte: "Chaque trouvaille passait sous sa lumière avant de rejoindre la vitrine. C'est bête, un vieil homme qui s'attache à une lampe, hein ?" },
  { humeur: "souriant", texte: "On en croise encore dans les vide-greniers, en état correct si on cherche bien. Rapporte-m'en une, tu veux ?" },
  { humeur: "rieur", texte: "Et négocie ! Si tu la paies plein pot, je le saurai. Je sais toujours." },
],
corps: [
  "Retrouver une **lampe à pétrole ancienne** en bon état.",
  "« Quarante ans qu'elle a éclairé mes trouvailles. Une boutique sans sa lampe, c'est une histoire sans lumière. »",
],
```

**trame_ch2 — Vendre, c'est vivre**
```ts
dialogue: [
  { humeur: "emu", texte: "Ma première vente, je l'ai ratée. Un miroir piqué, un client pressé… j'ai bafouillé, il est parti. J'ai pleuré derrière le rideau, tu sais." },
  { humeur: "songeur", texte: "Le lendemain, ta grand-mère m'a dit : « Recommence. » J'ai vendu un cadre à deux francs. Le plus beau jour de ma vie de marchand." },
  { humeur: "souriant", texte: "À toi maintenant. Fais chanter le tiroir-caisse : 300 € de ventes, et je te raconte la suite." },
],
corps: [
  "Cumuler **300 €** de ventes depuis l'acceptation.",
  "« Chiner, c'est le plaisir. Vendre, c'est le métier. Et le métier, ça s'apprend en vendant. »",
],
```

**trame_ch3 — Les mains d'or** (garder le commentaire de décision du 2026-07-17 sur le seuil)
```ts
dialogue: [
  { humeur: "songeur", texte: "Regarde-les. Elles tremblent, maintenant. Ces mains ont recollé, poncé, verni pendant cinquante ans." },
  { humeur: "emu", texte: "Prends mes outils. Ils sont à toi — le maillet a son histoire, je te la raconterai un jour." },
  { humeur: "souriant", texte: "Trouve une pièce abîmée et rends-lui figure. La première fois qu'un objet revit entre tes doigts… tu verras." },
],
corps: [
  "Restaurer un objet jusqu'à l'état **Bon**.",
  "« Un objet abîmé, c'est une histoire qui bégaie. Répare-la. »",
],
```

**trame_ch4 — Le pichet de ta grand-mère**
```ts
dialogue: [
  { humeur: "emu", texte: "Ta grand-mère avait un pichet en faïence, bleu, ébréché au bec. Il trônait sur le buffet, toujours plein de fleurs des champs." },
  { humeur: "songeur", texte: "Un hiver difficile, je l'ai vendu. Elle n'a rien dit. C'est ce silence-là que je n'ai jamais su réparer." },
  { humeur: "songeur", texte: "Elle rêvait que je lui offre les bijoux d'une reine, un jour. Moi, je n'ai même pas su lui garder son pichet." },
  { humeur: "souriant", texte: "On en trouve des pareils dans les vide-greniers. Retrouve-le-moi. Enfin… retrouve-le-lui." },
],
corps: [
  "Retrouver un **pichet en faïence émaillée**.",
  "« Je l'ai vendu un hiver de dèche. Certains regrets ont la forme d'un pichet bleu. »",
],
```

- [ ] **Step 3: Vérifier** — `npx vitest run src/data` PASS (test longueurs), tsc propre.
- [ ] **Step 4: Commit** — `feat(trame): textes définitifs de l'acte I (ch1-4)`

---

### Task 2: Textes définitifs — Acte II (chapitres 5-8)

**Files:** mêmes fichiers que Task 1, blocs `trame_ch5` à `trame_ch8` (champs `dialogue`/`corps` uniquement ; garder le commentaire de décision 2026-07-17 sur ch7).

- [ ] **Step 1: Remplacer les textes (VERBATIM)** :

**trame_ch5 — Un nom qui circule**
```ts
dialogue: [
  { humeur: "rieur", texte: "On m'a parlé de toi au café, ce matin ! « Le petit de la boutique », qu'ils disent. Ils disaient pareil de moi, en 1975." },
  { humeur: "songeur", texte: "Dans ce métier, ton nom vaut plus que ta caisse. Il se gagne lentement, aux étals, une poignée de main à la fois." },
  { humeur: "souriant", texte: "Continue de chiner, de vendre, d'apprendre. Quand les marchés murmureront ton nom, je le saurai avant toi." },
],
corps: [
  "Atteindre le **niveau 8** de brocanteur.",
  "« Ton nom vaut plus que ta caisse. Fais-le circuler. »",
],
```

**trame_ch6 — Le flair**
```ts
dialogue: [
  { humeur: "songeur", texte: "Un jour, j'ai laissé filer une tabatière en argent pour trois sous. Revendue dix fois son prix la semaine d'après, sous mes yeux." },
  { humeur: "emu", texte: "Je n'ai pas dormi de la nuit. Pas pour l'argent — pour n'avoir pas su voir." },
  { humeur: "souriant", texte: "Le flair, ça se forge. Fais-moi un joli coup : cent euros de mieux sur une seule vente, et je croirai que tu as l'œil." },
],
corps: [
  "Réaliser un profit d'au moins **100 €** sur une seule vente.",
  "« Acheter juste, vendre juste. Entre les deux, il y a l'œil. »",
],
```

**trame_ch7 — Une vitrine digne de ce nom**
```ts
dialogue: [
  { humeur: "souriant", texte: "J'ai fait le tour de ta collection ce matin, pendant que tu dormais. Permets — vieille habitude." },
  { humeur: "emu", texte: "Il y a du goût, là-dedans. Du vrai. Ta grand-mère aurait déplacé deux ou trois choses, mais elle aurait souri." },
  { humeur: "songeur", texte: "Étoffe-la encore. Une collection, c'est un visage : il faut qu'on te reconnaisse au premier regard." },
],
corps: [
  "Atteindre **1 500 €** de valeur de collection.",
  "« Une collection, c'est un visage. Fais que le tien soit inoubliable. »",
],
```

**trame_ch8 — Le beau monde**
```ts
dialogue: [
  { humeur: "songeur", texte: "Chez les collectionneurs, on murmure de nouveau sur les bijoux de la reine. Les rumeurs reviennent toujours par les salons." },
  { humeur: "souriant", texte: "Pour y entrer, il faut montrer patte blanche. Une belle gravure, impeccable — voilà qui ouvre les portes feutrées." },
  { humeur: "emu", texte: "J'ai passé trente ans à guetter ces murmures. Toi, tu vas t'asseoir à leur table." },
],
corps: [
  "Retrouver une **gravure « Vue de Paris »** en très bon état.",
  "« Là-haut, on ne pardonne pas l'à-peu-près. Impeccable, tu m'entends. »",
],
```

- [ ] **Step 2: Vérifier** — `npx vitest run src/data` PASS, tsc propre.
- [ ] **Step 3: Commit** — `feat(trame): textes définitifs de l'acte II (ch5-8)`

---

### Task 3: Textes définitifs — Acte III (chapitres 9-12)

**Files:** mêmes fichiers, blocs `trame_ch9` à `trame_ch12` (garder le commentaire de décision sur ch9) ; activer le test `it.skip` posé en Task 1.

- [ ] **Step 1: Remplacer les textes (VERBATIM)** :

**trame_ch9 — Pièce de maître**
```ts
dialogue: [
  { humeur: "songeur", texte: "Il y a l'ouvrage propre, et il y a l'ouvrage de maître. Cinquante ans d'établi, et je compte sur une main ceux qui ont franchi ce pas." },
  { humeur: "emu", texte: "Un objet remis à neuf, c'est une vie qu'on prolonge. La mienne s'est usée à ça — et je ne regrette rien." },
  { humeur: "souriant", texte: "Prends ton temps, choisis ta pièce, et rends-la parfaite. Le Grand Salon ne mérite rien de moins. Toi non plus." },
],
corps: [
  "Restaurer un objet jusqu'à l'état **Pristin état**.",
  "« Un objet remis à neuf, c'est une vie qu'on prolonge. »",
],
```

**trame_ch10 — L'invitation** (narratif)
```ts
dialogue: [
  { humeur: "songeur", texte: "Assieds-toi. Il est temps que je te raconte la fin — ou le début, c'est selon." },
  { humeur: "emu", texte: "Les bijoux de la reine. Cinquante ans que je les cherche. J'ai vu passer leur trace dans trois ventes, deux inventaires, un mensonge. Chaque fois, trop tard." },
  { humeur: "emu", texte: "C'est pour eux que j'ai raté des dimanches, des anniversaires… le pichet de ta grand-mère. Un rêve, ça éclaire — mais ça brûle aussi, quand on le tient trop près." },
  { humeur: "souriant", texte: "Le Grand Salon des Antiquaires t'ouvre ses portes — les organisateurs t'écriront. C'est là que tout s'arrête, ou que tout s'achève. Vas-y pour moi." },
],
corps: [
  "Le grand-père a tout raconté : cinquante ans de quête, et le Grand Salon comme dernière piste.",
  "« C'est là que tout s'arrête, ou que tout s'achève. »",
],
```

**trame_ch11 — Les bijoux de la reine**
```ts
dialogue: [
  { humeur: "songeur", texte: "Ils sont là, quelque part, entre les vitrines du Grand Salon. Je le sens comme on sent l'orage." },
  { humeur: "souriant", texte: "Je ne viens pas. C'est ton regard qu'il faut, plus le mien. Trouve-les — et garde-les. Ils sont à toi. Le rêve, lui, m'appartient encore un peu." },
],
corps: [
  "Acquérir **les bijoux de la reine** au Grand Salon. Ils resteront dans ta collection.",
  "« Cinquante ans que je les cherche. À toi de tendre la main. »",
],
```

**trame_ch12 — La remise des clés** (narratif)
```ts
dialogue: [
  { humeur: "emu", texte: "Alors c'est vrai. Ils existent. Là, dans ta vitrine… Laisse-moi les regarder encore un peu." },
  { humeur: "rieur", texte: "Ta grand-mère dirait que le bleu du pichet leur allait mieux. Elle aurait raison, comme toujours." },
  { humeur: "songeur", texte: "Mon rêve est accompli — pas comme je l'imaginais : mieux. C'est toi qui l'as fini. Une histoire n'appartient jamais à celui qui la commence, tu sais." },
  { humeur: "souriant", texte: "Tiens : les clés. Toutes. Moi, j'ai un train demain — Venise d'abord, ensuite on verra. Je t'écrirai. Prends soin de la boutique… elle a toujours pris soin de nous." },
],
corps: [
  "La boutique est à toi. Le grand-père part en voyage — il écrira.",
  "« Une histoire n'appartient jamais à celui qui la commence. »",
],
```

- [ ] **Step 2: Activer le test « plus aucun texte provisoire »** (retirer `.skip`) — il doit encore ÉCHOUER ici (invitations/ restent provisoires) → NON : il scanne `quetesPrincipales.ts` uniquement, donc il PASSE dès cette task. Vérifier qu'il passe.
- [ ] **Step 3: Vérifier** — `npx vitest run src/data` PASS, tsc propre.
- [ ] **Step 4: Commit** — `feat(trame): textes définitifs de l'acte III (ch9-12)`

---

### Task 4: Invitations définitives + lettre de Maman ajustée

**Files:**
- Modify: `src/data/invitationsOrganisateurs.ts` (textes + retrait des `// SP3 : texte provisoire`)
- Modify: `src/lib/courrier.ts` (`creerLettreMamanDebut` : corps ajusté à la nouvelle histoire)
- Test: `src/lib/courrier.test.ts` (parité de paragraphes maintenue si un test l'asserte — vérifier)

**Interfaces:**
- Produces: textes FR canoniques pour les overlays (Tasks 7-8). La lettre de Maman passe à **4 paragraphes** (comme avant — vérifier le nombre actuel et garder la parité, sinon adapter les overlays existants en Task 7-8).

- [ ] **Step 1: Invitations (VERBATIM)** :

```ts
export const INVITATIONS_ORGANISATEURS: Record<2 | 3 | 4, { titre: string; corps: string[] }> = {
  2: {
    titre: "Invitation aux marchés de la ville",
    corps: [
      "Votre étal ne passe plus inaperçu : plusieurs de nos exposants nous ont parlé de vous.",
      "Les **marchés ★★ de la ville** vous sont désormais ouverts. Présentez-vous à l'entrée — votre nom suffira.",
    ],
  },
  3: {
    titre: "Invitation aux salons",
    corps: [
      "Votre réputation vous précède — c'est une chose rare, et nous savons la reconnaître.",
      "Les **salons ★★★** seront honorés de votre visite. Tenue correcte appréciée, œil aiguisé exigé.",
    ],
  },
  4: {
    titre: "Le Grand Salon des Antiquaires",
    corps: [
      "Peu de noms entrent au **Grand Salon**. Le vôtre vient d'y être inscrit.",
      "Nous vous attendons. Certains y cherchent des trésors ; les plus sages y trouvent des histoires.",
    ],
  },
};
```

- [ ] **Step 2: Lettre de Maman (VERBATIM — titre inchangé « Pour bien démarrer »)** :

```ts
corps: [
  "Mon cher enfant,",
  "Alors ça y est : ton grand-père t'a confié la boutique ! Marcel ne me l'a dit qu'après, évidemment — tu le connais. Je crois qu'il n'a jamais été aussi fier, même s'il bougonnera si tu le lui répètes.",
  "Je glisse **150 €** dans l'enveloppe pour t'aider à démarrer. Offre-toi une belle pièce pour ta vitrine, ou garde-les pour les jours creux.",
  "Veille un peu sur lui, veux-tu ? Et viens me voir quand tu auras une minute.",
],
```

- [ ] **Step 3: Vérifier** — `npx vitest run src/lib/courrier.test.ts src/data` PASS (⚠ si un test EN/ES compare le nombre de paragraphes de Maman, il est dans le `describe.skip` de `courrier.test.ts` — ne pas le réactiver ici, c'est la Task 7), tsc propre.
- [ ] **Step 4: Commit** — `feat(trame): invitations définitives + lettre de Maman ajustée à la transmission`

---

### Task 5: Épilogue — cartes postales du grand-père

**Files:**
- Create: `src/data/cartesPostales.ts`
- Modify: `src/lib/courrier.ts` (helper `creerCartePostale`)
- Modify: `src/lib/quetes/tick.ts` (injection dans `tickQuetes`, aujourd'hui passthrough)
- Test: `src/lib/quetes/tick.test.ts`, `src/lib/courrier.test.ts`

**Interfaces:**
- Consumes: `tickQuetes(state, jour)` (signature existante, conservée), mission `trame_ch12` (`jourResolution`).
- Produces:
  - `CARTES_POSTALES: ReadonlyArray<{ id: string; titre: string; corps: string[] }>` (5 cartes, ids `carte_postale_1..5`)
  - `INTERVALLE_CARTES_POSTALES = 6` (jours)
  - `creerCartePostale(index: number, jour: number): Courrier` (type lettre, expéditeur `grand-pere`, `lu: false`)
  - `tickQuetes` : si `trame_ch12` est livrée, injecte la carte `k` (1-based) quand `jour >= jourResolution + k * INTERVALLE_CARTES_POSTALES` — au plus UNE carte par tick, idempotent par id, s'arrête après la 5ᵉ.

- [ ] **Step 1: Tests qui échouent** (`src/lib/quetes/tick.test.ts`) :

```ts
describe("cartes postales (épilogue)", () => {
  const finTrame = (jourResolution: number) => createMockGameState({
    tutorielEtape: "termine",
    missions: [{ courrierId: "trame_ch12", statut: "livree", jourResolution }],
  });
  it("rien avant l'intervalle", () => {
    const t = tickQuetes(finTrame(10), 15);
    expect(t.courriers.some((c) => c.id.startsWith("carte_postale"))).toBe(false);
  });
  it("injecte la carte 1 à J+6, non lue, expéditeur grand-père", () => {
    const t = tickQuetes(finTrame(10), 16);
    const carte = t.courriers.find((c) => c.id === "carte_postale_1");
    expect(carte).toBeDefined();
    expect(carte?.lu).toBe(false);
  });
  it("une seule carte par tick, idempotent, s'arrête à 5", () => {
    let state = finTrame(0);
    for (let jour = 1; jour <= 60; jour++) {
      const t = tickQuetes({ ...state, jourActuel: jour }, jour);
      state = { ...state, courriers: t.courriers, missions: t.missions };
    }
    const cartes = state.courriers.filter((c) => c.id.startsWith("carte_postale"));
    expect(cartes.map((c) => c.id).sort()).toEqual(
      ["carte_postale_1", "carte_postale_2", "carte_postale_3", "carte_postale_4", "carte_postale_5"],
    );
  });
  it("rien si la trame n'est pas finie", () => {
    const t = tickQuetes(createMockGameState({ tutorielEtape: "termine" }), 50);
    expect(t.courriers.some((c) => c.id.startsWith("carte_postale"))).toBe(false);
  });
});
```

- [ ] **Step 2: Data (VERBATIM)** — `src/data/cartesPostales.ts` :

```ts
/** Épilogue : cartes postales du grand-père en voyage, injectées une à une
 *  après la remise des clés (trame_ch12). Contenu léger — garde le
 *  personnage vivant. */
export const INTERVALLE_CARTES_POSTALES = 6; // jours de jeu entre deux cartes

export const CARTES_POSTALES: ReadonlyArray<{ id: string; titre: string; corps: string[] }> = [
  {
    id: "carte_postale_1",
    titre: "Carte de Venise",
    corps: [
      "Il pleut sur la lagune et tout le monde trouve ça triste, sauf moi. Les reflets doublent la ville — deux Venise pour le prix d'une, quelle affaire.",
      "J'ai marchandé un verre de Murano pour le principe. J'ai perdu. Le vendeur avait ton âge — bon signe pour le métier.",
      "Prends soin de la boutique. — Grand-père",
    ],
  },
  {
    id: "carte_postale_2",
    titre: "Carte de Lisbonne",
    corps: [
      "Les tramways d'ici grincent exactement comme l'escalier de la boutique. Je me suis senti chez moi tout de suite.",
      "Une dame m'a vendu des azulejos « du XVIIIᵉ ». Ils sont de 1974. Je les ai pris quand même : c'est l'histoire qu'on achète, pas la date.",
      "— Grand-père",
    ],
  },
  {
    id: "carte_postale_3",
    titre: "Carte de Marrakech",
    corps: [
      "Le souk, petit. LE SOUK. J'ai négocié trois heures pour une théière ; on a fini par boire le thé dedans, chez sa grand-mère à lui.",
      "Je t'apprendrai le geste des mains, un jour. Ça ne s'écrit pas.",
      "— Grand-père",
    ],
  },
  {
    id: "carte_postale_4",
    titre: "Carte de Kyoto",
    corps: [
      "Ici, on répare les bols cassés à la poudre d'or. Ils appellent ça kintsugi : la cicatrice fait partie de la beauté.",
      "J'ai pensé à mes mains, et à toi, à l'établi. On avait raison de recoller les choses, tu sais.",
      "— Grand-père",
    ],
  },
  {
    id: "carte_postale_5",
    titre: "Carte sans timbre",
    corps: [
      "On me demande partout ce que je cherchais, à courir ainsi après les bijoux d'une reine. Je réponds : rien — j'avais déjà tout, au-dessus d'une boutique de brocante.",
      "Le train repart. Je ne sais pas encore vers où, et c'est très bien ainsi.",
      "À bientôt, petit. — Grand-père",
    ],
  },
];
```

- [ ] **Step 3: Helper + injection** — `creerCartePostale(index, jour)` dans `courrier.ts` (patron `creerLettreInvitation` : type lettre, `expediteurId: "grand-pere"`, `lu: false`, id/titre/corps depuis `CARTES_POSTALES[index - 1]`). Dans `tickQuetes` : garder le early-return tutoriel ; puis :

```ts
const ch12 = state.missions.find(
  (m) => m.courrierId === "trame_ch12" && m.statut === "livree",
);
if (ch12?.jourResolution !== undefined) {
  const prochaine = CARTES_POSTALES.findIndex(
    (c) => !state.courriers.some((cr) => cr.id === c.id),
  );
  if (
    prochaine !== -1 &&
    jour >= ch12.jourResolution + (prochaine + 1) * INTERVALLE_CARTES_POSTALES
  ) {
    return {
      courriers: [...state.courriers, creerCartePostale(prochaine + 1, jour)],
      missions: state.missions,
    };
  }
}
return { courriers: state.courriers, missions: state.missions };
```

- [ ] **Step 4: Vérifier** — RED confirmé au Step 1, puis `npx vitest run src/lib/quetes src/lib/courrier.test.ts` PASS ; suite complète + tsc.
- [ ] **Step 5: Commit** — `feat(trame): épilogue cartes postales (5 cartes, une tous les 6 jours après ch12)`

---

### Task 6: Nettoyages reportés (migration, raisons, accessibilité, copie EN)

**Files:**
- Modify: `src/lib/migrations.ts` (bloc `!dejaV13` : missions `principale_*` ACTIVES → `expiree`)
- Modify: `src/context/GameContext.tsx` (`livrerMission` : raison dédiée quand `missionLivrable` échoue)
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts` (clé `raisons.objectifsNonAtteints` — repérer le bloc réel des raisons via `grep -n "objetsRequisManquants" src/lib/i18n/ui/fr.ts`)
- Modify: `src/components/mobile/dialogue/DialogueOverlay.tsx` (accname « Continuer » en dur → clé i18n existante `d.menu.continuer`)
- Modify: `src/lib/i18n/ui/en.ts` (~l.271/274 : copie tutoriel `pick "Pick"` → `choose "Pick"` et `choose "Set up stall" to get your window ready` — retrouver les lignes exactes via `grep -n '"Pick"' src/lib/i18n/ui/en.ts`)
- Test: `src/lib/migrations.test.ts`, `src/components/mobile/dialogue/DialogueOverlay.test.tsx`

- [ ] **Step 1: Tests qui échouent** :

```ts
// migrations.test.ts
it("v12→v13 : une ancienne mission principale_* ACTIVE est close (expiree), la livrée reste livrée", () => {
  const save = saveV12({
    missions: [
      { courrierId: "principale_ch2", statut: "active" },
      { courrierId: "principale_ch1", statut: "livree", jourResolution: 3 },
    ],
  });
  const migre = migrate(save);
  expect(migre.missions.find((m) => m.courrierId === "principale_ch2")?.statut).toBe("expiree");
  expect(migre.missions.find((m) => m.courrierId === "principale_ch1")?.statut).toBe("livree");
});
```

```tsx
// DialogueOverlay.test.tsx — l'accname suit la locale (adapter au harnais existant du fichier)
it("le bouton d'avancement porte l'accname localisé", () => {
  // rendre avec le provider EN du harnais existant → getByRole("button", { name: "Continue" })
});
```

- [ ] **Step 2: Implémenter** —
  - migrations : dans le bloc gaté `!dejaV13`, mapper `missions` : `m.courrierId.startsWith("principale_") && m.statut === "active"` → `{ ...m, statut: "expiree", jourResolution: jourCourant }` (commentaire : « ancien arc clos à la migration — la trame le remplace ; le courrier reste en archive »).
  - livrerMission : la garde `missionLivrable` (posée en SP2) retourne `raisonLocalisee("objectifsNonAtteints")` au lieu de `objetsRequisManquants`.
  - Clés : fr `objectifsNonAtteints: "Objectifs pas encore atteints."`, en `"Objectives not yet met."`, es `"Objetivos aún no alcanzados."`.
  - DialogueOverlay : remplacer la chaîne en dur par `d.menu.continuer` (vérifier que la clé existe dans les 3 langues — sinon utiliser la clé commune adéquate trouvée par grep).
- [ ] **Step 3: Vérifier** — `npx vitest run src/lib/migrations.test.ts src/components/mobile/dialogue` PASS + suite complète + tsc + eslint fichiers touchés.
- [ ] **Step 4: Commit** — `chore(trame): nettoyages SP3 — arc legacy clos en migration, raison de livraison dédiée, a11y dialogue, copie EN`

---

### Task 7: Overlays EN — contenu de la trame

**Files:**
- Modify: `src/lib/i18n/contenu/en/courrier.ts` (remplacer les entrées `principale_*` par `trame_ch1..12` + invitations + cartes postales + lettre de Maman ré-ajustée)
- Create (si le modèle des dialogues l'exige — vérifier `src/lib/i18n/contenu/en/dialogues.ts`) : entrées d'overlay des DIALOGUES de chapitres `trame_chN` (même clé id → tableau de lignes, patron des `tuto_*`)
- Modify: `src/lib/i18n/contenu/courrier.test.ts` (RÉACTIVER le `describe.skip` posé en SP2)
- Test: `src/lib/i18n/contenu/courrier.test.ts`, test de parité des dialogues (`grep -rn "lignesDialogue\|dialogues" src/lib/i18n/contenu/*.test.ts`)

**Interfaces:**
- Consumes: textes FR des Tasks 1-5 (source canonique). Registre : traduction littéraire, voix douce/nostalgique ; noms d'objets cohérents avec `en/objets.ts` (lampe = « Antique oil lamp », pichet = « Enamelled earthenware pitcher », gravure = « 'View of Paris' Jouy print », bijoux = « The Queen's jewels ») ; « Grand Salon » → « Grand Antiques Fair » comme `en/brocantes.ts`. MÊME NOMBRE de paragraphes/lignes que le FR.

- [ ] **Step 1: Réactiver le test de parité** (retirer `.skip`, étendre `IDS` aux invitations `invitation_tier2/3/4` et aux cartes `carte_postale_1..5`) → RED (overlays manquants + orphelins `principale_*`).
- [ ] **Step 2: Écrire les overlays EN** — traduire chaque texte FR de ce plan (chapitres : titre + corps ; invitations ; cartes postales ; Maman — mentionner « Marcel » tel quel). Retirer les entrées `principale_*` (orphelines — le fallback FR couvre les vieilles saves). Si les dialogues de chapitres ont un mécanisme d'overlay (comme les `tuto_*` dans `en/dialogues.ts`), traduire aussi les lignes de dialogue des 12 chapitres ; sinon signaler en concern que les dialogues restent FR-only et pourquoi.
- [ ] **Step 3: Vérifier** — `npx vitest run src/lib/i18n` PASS + tsc.
- [ ] **Step 4: Commit** — `feat(i18n): overlays EN du contenu de la trame (chapitres, invitations, cartes postales, Maman)`

---

### Task 8: Overlays ES — contenu de la trame

**Files:** miroir exact de la Task 7 sur `src/lib/i18n/contenu/es/*` (registre : cohérent avec `es/objets.ts`/`es/brocantes.ts` ; « Gran Salón »). Le test de parité réactivé en Task 7 couvre déjà ES via `describe.each` → il est RED côté ES tant que cette task n'est pas faite (si la Task 7 doit rester verte seule, réactiver EN et ES en deux temps dans le même `each` n'est pas possible — dans ce cas la Task 7 réactive le test mais la suite n'est verte qu'après la Task 8 : les exécuter dos à dos, ou réactiver le test en Task 8 ; choisir la seconde option si besoin d'une suite verte entre les deux et le NOTER).

- [ ] **Step 1: Écrire les overlays ES** (chapitres, invitations, cartes postales, Maman, dialogues si mécanisme).
- [ ] **Step 2: Vérifier** — `npx vitest run src/lib/i18n` PASS (EN + ES) + suite complète + tsc.
- [ ] **Step 3: Commit** — `feat(i18n): overlays ES du contenu de la trame`

---

### Task 9: Équilibrage final

**Files:**
- Modify: `src/data/quetesPrincipales.ts` (récompenses)
- Modify: `docs/superpowers/specs/2026-07-16-trame-scenaristique-design.md` (tableaux mis à jour)
- Régénérer: `docs/equilibrage/` (rapport simulation)

- [ ] **Step 1: Récompenses finales** (rationale : ~couvrir plusieurs frais d'entrée du tier suivant — 5/10/25/50 € — + un achat moyen ; le ch12 est le cadeau de départ « généreux » de la spec) :

| ch | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| € | 60 | 80 | 100 | 120 | 180 | 200 | 220 | 260 | 320 | 200 | 600 | 800 |

- [ ] **Step 2: Vérifier le ch5 (niveau 8) au simulateur** — `SIMULATION=1 npx vitest run src/lib/simulation` : dans le rapport généré, vérifier que le run médian atteint le niveau 8 dans une fenêtre raisonnable de l'acte II (avant ~J25). Si non : abaisser à `niveau: 6` (et mettre la spec à jour). Committer le rapport régénéré (le simulateur ayant été corrigé en SP2, l'ancien rapport du 2026-07-06 est périmé).
- [ ] **Step 3: Vérifier** — suite complète + tsc.
- [ ] **Step 4: Commit** — `feat(trame): récompenses finales + rapport d'équilibrage régénéré (gates par chapitres)`

---

### Task 10: Passe finale de branche

- [ ] **Step 1:** `npx tsc --noEmit` ; `npx eslint src` ; `npx vitest run` — tout vert, plus AUCUN `describe.skip` lié à la trame (seul `calibration.probe` pré-existant reste).
- [ ] **Step 2:** `grep -rn "SP3" src --include="*.ts" --include="*.tsx" | grep -v test` — plus aucun marqueur de texte provisoire ni de report SP3 dans le code source.
- [ ] **Step 3:** Vérification E2E (dev server + Playwright, patron du script SP2 `scratchpad/verify-sp2.mjs`) : nouvelle partie → passer le tutoriel → pastille → dialogue ch1 avec le TEXTE DÉFINITIF (« Quarante ans que ma vieille lampe… ») → acceptation. Vérifier aussi en locale EN que le titre du ch1 au carnet est traduit.
- [ ] **Step 4:** Revue finale de branche (superpowers:requesting-code-review) puis mise à jour de la mémoire projet (SP3 fait — trame COMPLÈTE, reste vérif device + merge de la pile SP1→SP2→SP3).

---

## Self-review (fait à l'écriture)

- **Couverture spec** : 12 chapitres écrits (Tasks 1-3) ; épilogue cartes postales (Task 5, spec §Épilogue) ; lettre de Maman ajustée (Task 4, spec §8) ; prénom Marcel confirmé et cantonné à la lettre de Maman (spec §9) ; i18n EN/ES (Tasks 7-8) ; « remplacement de l'ancien arc » : données remplacées en SP2, overlays et clôture des missions legacy ici (Tasks 6-7) ; migration : complément Task 6 (missions actives closes). Équilibrage (Task 9) : récompenses + ch5, rapport régénéré.
- **Placeholder scan** : les textes sont complets et verbatim ; les deux points laissés à la découverte de l'implémenteur (mécanisme d'overlay des dialogues, harnais de test DialogueOverlay) sont bornés par une instruction de vérification + issue de repli explicite.
- **Type consistency** : `CARTES_POSTALES`/`INTERVALLE_CARTES_POSTALES`/`creerCartePostale(index, jour)` identiques entre Tasks 5 et 7-8 ; ids `carte_postale_1..5` et `invitation_tier{N}` cohérents avec SP2 ; `tickQuetes` garde sa signature SP2.
