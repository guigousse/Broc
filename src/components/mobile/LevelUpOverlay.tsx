"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useGame, useGameActions } from "@/context/GameContext";
import {
  audioManager,
  PIC_EXPLOSION_S,
  SON_EXPLOSION,
} from "@/lib/audio/audioManager";
import { vibrerExplosion } from "@/lib/haptique";
import {
  COUT_TOTAL_COMPETENCES,
  pointsDepensesCompetences,
} from "@/data/competences";
import {
  deblocagesPourNiveau,
  prochainDeblocage,
} from "@/data/deblocagesNiveau";
import { ROUTES_SESSION_PREFIXES } from "@/components/mobile/TabBar";
import { estRoutePartie } from "@/lib/routesPartie";
import { prefersReducedMotion } from "@/lib/transitionIris";
import { useLangue } from "@/lib/i18n/LangueContext";
import { titreDeblocage, descriptionDeblocage } from "@/lib/i18n/contenu";
import { extraireEmoji } from "@/lib/emoji";
import { MedaillonAtout } from "@/components/mobile/MedaillonAtout";
import { BazarcoinIcon } from "@/components/ui/BazarcoinIcon";
import { JETONS_NIVEAU_MAX, NIVEAU_BROCANTEUR_MAX } from "@/lib/xp";
import { tutorielActif } from "@/lib/tutoriel";
import { getCoachOuvert, subscribeCoachOuvert } from "@/lib/coachActif";
import { getDialogueActif, subscribeDialogueActif } from "@/lib/dialogueActif";
import { demanderNotation } from "@/lib/soutien/notation";
import {
  marquerNotationNiveauFaite,
  notationNiveauFaite,
} from "@/lib/soutien/vu";

// ── Chronologie (secondes) ────────────────────────────────────────────────
// Deux temps : le chiffre seul (son + feu d'artifice), puis l'encadré des
// récompenses. Le premier temps va jusqu'au bout du feu — le texte ne doit pas
// arriver pendant que ça pétarade. Le tout tient en ~3 s : la célébration se
// rejoue à chaque niveau, elle ne doit pas devenir une attente.
const DELAI_TITRE = 0.15;
const DELAI_SON_MS = 450;
const DELAI_ARTIFICE = 0.55;
// Le cadre attend l'extinction de la DERNIÈRE étincelle : dernier bouquet à
// 0,55 + 0,52 s, plus jusqu'à 0,07 s de jitter, vol de 1,1 s → 2,24 s.
// (Les détonations, elles, partent un poil AVANT leur bouquet — voir
// PIC_EXPLOSION_S : c'est le bang qui doit tomber sur l'éclat, pas le début
// du fichier.)
const DELAI_CARTE = 2.25;
// Le cadre n'a plus de titre à l'intérieur : s'il montait vide, on verrait un
// grand rectangle vert. Le premier intertitre le suit de près.
const DELAI_PREMIERE_LIGNE = DELAI_CARTE + 0.15;
const ECART_LIGNE = 0.09;
const ECART_BOUTON = 0.2;

/** Le niveau à partir duquel on ose demander un avis. Cf. commentaire ci-dessous. */
const NIVEAU_NOTATION = 10;

// ── Feu d'artifice ────────────────────────────────────────────────────────
const COULEURS_ARTIFICE = ["#C5A059", "#3B6A52", "#A33B2A", "#3B6EA5"];

/**
 * Les bouquets, en px depuis le centre du chiffre. Le premier part de ce
 * centre exact, les suivants éclatent autour à contretemps — un vrai feu
 * d'artifice ne tire pas tout d'un coup.
 */
const BOUQUETS = [
  { x: 0, y: 0, nb: 16, rayon: 150, retard: 0, force: 1, vitesse: 1 },
  { x: -95, y: -55, nb: 12, rayon: 100, retard: 0.2, force: 0.72, vitesse: 1.14 },
  { x: 98, y: -40, nb: 12, rayon: 104, retard: 0.36, force: 0.66, vitesse: 0.92 },
  { x: -28, y: -108, nb: 10, rayon: 88, retard: 0.52, force: 0.58, vitesse: 1.06 },
];
// Tous les points de tir sont AU NIVEAU DU CHIFFRE OU AU-DESSUS : un bouquet
// centré plus bas éclatait pile sur la première mention du cadre au moment où
// elle apparaissait, et la rendait illisible pendant une seconde (mesuré).

/**
 * Suite pseudo-aléatoire déterministe (LCG) : même feu à chaque rendu, donc
 * stable en test et insensible au double-rendu de StrictMode. `Math.random()`
 * ferait sauter les étincelles d'une place à l'autre entre les deux passes.
 */
function alea(index: number, canal: number): number {
  return ((index * 9301 + canal * 49297 + 233) % 233280) / 233280;
}

type Etincelle = {
  bx: number;
  by: number;
  dx: number;
  dy: number;
  rotation: number;
  delai: number;
  epaisseur: number;
  longueur: number;
  couleur: string;
};

function construireFeu(): Etincelle[] {
  const etincelles: Etincelle[] = [];
  let graine = 0;
  BOUQUETS.forEach((b, ib) => {
    // Un bouquet = deux couleurs alternées, pas les quatre : c'est ce qui le
    // fait lire comme une explosion et non comme une poignée de confettis.
    const teintes = [
      COULEURS_ARTIFICE[ib % COULEURS_ARTIFICE.length],
      COULEURS_ARTIFICE[(ib + 2) % COULEURS_ARTIFICE.length],
    ];
    for (let k = 0; k < b.nb; k += 1) {
      const i = graine++;
      // Rayons régulièrement répartis sur 360°, à peine désalignés : c'est la
      // régularité qui donne l'étoile ; le jitter enlève l'air mécanique.
      const angle =
        ((k + (alea(i, 1) - 0.5) * 0.45) / b.nb) * Math.PI * 2;
      const distance = b.rayon * (0.62 + alea(i, 2) * 0.38);
      etincelles.push({
        bx: b.x,
        by: b.y,
        dx: Math.round(Math.cos(angle) * distance),
        // Léger aplatissement + retombée : les étincelles basses vont plus loin.
        dy: Math.round(Math.sin(angle) * distance * 0.86 + b.rayon * 0.22),
        // Le grand axe pointe vers l'extérieur (+90° : le rectangle est vertical
        // au repos) et ne tourne pas — une étincelle file, elle ne culbute pas.
        rotation: Math.round((angle * 180) / Math.PI + 90),
        delai: b.retard + alea(i, 3) * 0.07,
        epaisseur: 3 + Math.round(alea(i, 4) * 2),
        longueur: 13 + Math.round(alea(i, 5) * 9),
        couleur: teintes[k % 2],
      });
    }
  });
  return etincelles;
}

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  background: "rgba(20,20,16,0.72)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  padding: 16,
  // Les étincelles des bouquets latéraux sortent de l'écran : on les coupe ici
  // plutôt que de laisser un débordement s'installer sur le body verrouillé.
  overflow: "hidden",
};

/**
 * Ancre du temps fort : le chiffre, et le feu d'artifice tiré depuis son
 * centre. `zIndex` pour que les bouquets bas passent DEVANT le cadre quand
 * celui-ci arrive, et non derrière.
 */
const blocTitre: CSSProperties = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  justifyContent: "center",
  // Le chiffre respire plus que le couple cadre/bouton, qui forme un bloc.
  marginBottom: 8,
};

/** Le « Niveau X », police des enseignes de brocante (Arcane Nine). */
const titreNiveau: CSSProperties = {
  fontFamily: "var(--font-brocante-title)",
  // 13vw et pas 15 : « Επίπεδο 100 » en grec est le libellé le plus long et
  // frôlait les bords sur un écran de 360 px (mesuré).
  fontSize: "clamp(42px, 13vw, 62px)",
  lineHeight: 1.05,
  color: "var(--brass-300)",
  textShadow:
    "0 2px 0 rgba(20,12,0,0.45), 0 0 28px rgba(224,178,92,0.55), 0 0 60px rgba(224,178,92,0.25)",
  whiteSpace: "nowrap",
};

const coucheArtifice: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: 0,
  height: 0,
  pointerEvents: "none",
};

/** L'encadré des récompenses : vert profond, gros cadre laiton, texte crème. */
const carte: CSSProperties = {
  position: "relative",
  background:
    "radial-gradient(circle at 50% 0%, var(--forest-700) 0%, var(--forest-800) 55%, var(--forest-900) 100%)",
  borderRadius: 4,
  border: "2px solid var(--brass-500)",
  boxShadow: "0 14px 34px rgba(0,0,0,0.55)",
  padding: "16px 18px 20px",
  maxWidth: 340,
  width: "100%",
  boxSizing: "border-box",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 8,
};

const ligneWrap: CSSProperties = { width: "100%" };

// ── Puces ─────────────────────────────────────────────────────────────────
// Chaque mention s'ouvre sur un gros point laiton, aligné sur la première
// ligne de texte. `flex-start` et pas `center` : sur un atout, le texte fait
// plusieurs lignes et la puce doit rester en haut.
const puceRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
};
const puce: CSSProperties = {
  flex: "0 0 auto",
  width: 9,
  height: 9,
  marginTop: 6,
  borderRadius: "50%",
  background: "var(--brass-500)",
};

function Puce({ children }: { children: ReactNode }) {
  return (
    <div style={puceRow}>
      <span style={puce} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

const sousTitre: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--paper-200)",
};

const ligneJetons: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--paper-200)",
};

const ligneDeblocage: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--paper-200)",
};

const atoutEnTete: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 4,
};

const atoutTitre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 17,
  color: "var(--paper-100)",
  lineHeight: 1.25,
};

const atoutDescription: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 14,
  lineHeight: 1.4,
  color: "var(--paper-300)",
  margin: 0,
};

const lignProchain: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--paper-300)",
};

// ── Intertitres de section ────────────────────────────────────────────────
const sectionRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  // Respire au-dessus : « À venir » ouvre une section, il ne doit pas coller
  // à la description de l'atout qui la précède.
  marginTop: 12,
};
const sectionLabel: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 13,
  color: "var(--brass-300)",
  whiteSpace: "nowrap",
};
const sectionFilet: CSSProperties = {
  flex: 1,
  height: 2,
  background: "linear-gradient(90deg, var(--brass-600), transparent)",
};

function Intertitre({ texte }: { texte: string }) {
  return (
    <div style={sectionRow}>
      <span style={sectionLabel}>{texte}</span>
      <span style={sectionFilet} aria-hidden="true" />
    </div>
  );
}

// Posé SOUS l'encadré, à sa largeur : la fenêtre porte l'information, le
// bouton porte l'action, les deux ne se mélangent pas.
const btnContinuer: CSSProperties = {
  width: "100%",
  maxWidth: 340,
  padding: "12px 6px",
  borderRadius: 10,
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  background: "var(--brass-500)",
  color: "var(--forest-900)",
  border: "1px solid var(--brass-300)",
  cursor: "pointer",
};

export function LevelUpOverlay() {
  const { state, marquerNiveauVu } = useGame();
  const { avancerTutoriel } = useGameActions();
  const pathname = usePathname();
  const { d, tr, locale } = useLangue();
  // Lu au premier rendu client : l'overlay ne rend rien côté serveur (aucune
  // save chargée au prerender), donc pas de risque de désaccord d'hydratation.
  const [mouvementReduit] = useState(prefersReducedMotion);
  const feu = useMemo(construireFeu, []);
  const enSession = ROUTES_SESSION_PREFIXES.some((p) => pathname?.startsWith(p));
  // Le tutoriel v3 rapporte ≥ 115 XP (achats + découvertes + négos + ventes)
  // alors que le niveau 1 est à 100 XP : le joueur passe niveau 1 À COUP SÛR
  // pendant le tutoriel. Pendant le tutoriel, la célébration attend de toute
  // façon (route de session) ; et juste après `terminerTutoriel()`, le
  // chapitre 1 s'enchaîne en dialogue (`tuto_conclusion`) — sans cette garde
  // la fanfare éclaterait par-dessus au retour au bureau (recette 2026-08-08).
  // La célébration n'est jamais perdue : `niveauVu` la conserve jusqu'à ce
  // que l'écran soit libre.
  const coachOuvert = useSyncExternalStore(
    subscribeCoachOuvert,
    getCoachOuvert,
    () => false,
  );
  const dialogueActif = useSyncExternalStore(
    subscribeDialogueActif,
    getDialogueActif,
    () => false,
  );
  // Hors partie (écran titre, mentions légales…), la save du slot actif reste
  // chargée dans le contexte : sans cette garde la célébration se déroulerait
  // par-dessus le menu principal (retour device 2026-07-25).
  const affichable =
    estRoutePartie(pathname) &&
    !enSession &&
    // Le tutoriel s'approprie la toute première montée de niveau : elle se
    // joue à l'étape dédiée (leçon des compétences), et reste bloquée
    // partout ailleurs pendant le tutoriel pour ne pas couper une leçon.
    (!state ||
      !tutorielActif(state) ||
      state.tutorielEtape === "niveau-celebration") &&
    !dialogueActif &&
    !coachOuvert;
  const niveauACelebrer =
    state && state.brocanteur.niveau > state.niveauVu ? state.niveauVu + 1 : null;

  // La fanfare attaque juste avant que le chiffre atteigne sa pleine taille,
  // puis chaque bouquet détone au moment où il éclate à l'écran. Tous les
  // timers sont annulés au démontage : changer de route pendant l'attente ne
  // doit pas laisser partir le son sur un écran qui n'affiche plus rien.
  useEffect(() => {
    if (niveauACelebrer === null || !affichable) return;
    if (mouvementReduit) {
      void audioManager.playLevelUp();
      return;
    }
    // Le tampon doit être chaud avant la première détonation (520 ms) : sinon
    // le `await` du chargement décale le bang et casse la synchro.
    void audioManager.preload([SON_EXPLOSION]);
    const timers = [
      setTimeout(() => void audioManager.playLevelUp(), DELAI_SON_MS),
      ...BOUQUETS.map((b) =>
        setTimeout(
          () => void audioManager.playExplosion(b.force, b.vitesse),
          (DELAI_ARTIFICE + b.retard - PIC_EXPLOSION_S / b.vitesse) * 1000,
        ),
      ),
      // Les secousses, elles, tombent PILE sur l'éclat : contrairement au son,
      // une vibration n'a pas d'attaque à rattraper, donc pas de PIC_EXPLOSION_S
      // à soustraire. Avancée comme le son, elle se sentirait avant qu'on voie.
      ...BOUQUETS.map((b) =>
        setTimeout(
          () => void vibrerExplosion(b.force),
          (DELAI_ARTIFICE + b.retard) * 1000,
        ),
      ),
    ];
    return () => timers.forEach(clearTimeout);
  }, [niveauACelebrer, affichable, mouvementReduit]);

  if (!state || niveauACelebrer === null || !affichable) return null;

  const deblocages = deblocagesPourNiveau(niveauACelebrer);
  const prochain = prochainDeblocage(niveauACelebrer);
  // Plafond « à vie » atteint (points dispo + déjà dépensés) : le niveau qui
  // franchit le plafond n'accorde plus réellement de point. Note : ceci masque
  // aussi la ligne pour le niveau qui octroie le tout dernier point (le calcul
  // ne distingue pas « ce niveau precis a été plafonné » — compromis accepté).
  const plafondCompetencesAtteint =
    state.brocanteur.pointsDisponibles +
      pointsDepensesCompetences(state.competencesDebloquees) >=
    COUT_TOTAL_COMPETENCES;

  // Ce que le niveau rapporte MAINTENANT (section « Récompenses »).
  const recompenses: { key: string; contenu: ReactNode }[] = [];
  if (!plafondCompetencesAtteint) {
    recompenses.push({
      key: "point",
      contenu: (
        <Puce>
          <div style={sousTitre}>{d.sheets.plusUnPointCompetence}</div>
        </Puce>
      ),
    });
  }
  // Le plafond de niveau verse ses Bazarcoins (cf. `crediterXPBrocanteur`).
  if (niveauACelebrer === NIVEAU_BROCANTEUR_MAX) {
    recompenses.push({
      key: "jetons",
      contenu: (
        <Puce>
          <div style={ligneJetons} data-testid="levelup-jetons">
            <span>{tr(d.sheets.plusJetonsNiveauMax, { n: JETONS_NIVEAU_MAX })}</span>
            <BazarcoinIcon size={13} />
          </div>
        </Puce>
      ),
    });
  }
  for (const dep of deblocages) {
    const titreLocal = titreDeblocage(dep, locale);
    if (dep.famille === "active") {
      const { emoji, texte } = extraireEmoji(titreLocal);
      recompenses.push({
        key: dep.titre,
        contenu: (
          <Puce>
            <div data-testid="levelup-atout">
              <div style={atoutEnTete}>
                {dep.activeId && (
                  <MedaillonAtout
                    activeId={dep.activeId}
                    taille={44}
                    bonusUsage={dep.usageSupplementaire}
                    emojiFallback={emoji ?? "✨"}
                  />
                )}
                <span style={atoutTitre}>{texte}</span>
              </div>
              <p style={atoutDescription}>{descriptionDeblocage(dep, locale)}</p>
            </div>
          </Puce>
        ),
      });
    } else {
      recompenses.push({
        key: dep.titre,
        contenu: (
          <Puce>
            <div style={ligneDeblocage}>{titreLocal}</div>
          </Puce>
        ),
      });
    }
  }

  // Ce que promet le palier suivant (section « À venir »). Même puce que les
  // récompenses : sans elle, la ligne seule sous son intertitre flottait.
  const aVenir: { key: string; contenu: ReactNode }[] = prochain
    ? [
        {
          key: "prochain",
          contenu: (
            <Puce>
              <div style={lignProchain}>
                {tr(d.sheets.nivAbrege, { n: prochain.niveau })} ·{" "}
                {titreDeblocage(prochain, locale)}
              </div>
            </Puce>
          ),
        },
      ]
    : [];

  // Cascade unique sur toute la carte : les intertitres comptent comme des
  // lignes, sinon la section « À venir » démarrerait avant la fin de la
  // précédente. Une section vide (plafond atteint, niveau sans déblocage,
  // dernier palier franchi) est retirée avec son intertitre.
  const lignes: { key: string; contenu: ReactNode }[] = [
    ...(recompenses.length
      ? [
          {
            key: "titre-recompenses",
            contenu: <Intertitre texte={d.sheets.sectionRecompenses} />,
          },
          ...recompenses,
        ]
      : []),
    ...(aVenir.length
      ? [
          {
            key: "titre-avenir",
            contenu: <Intertitre texte={d.sheets.sectionAVenir} />,
          },
          ...aVenir,
        ]
      : []),
  ];

  // Mouvement réduit : plus aucune attente, tout est là d'emblée (le bloc
  // @media neutralise les animations mais pas les délais).
  const t = (secondes: number) => (mouvementReduit ? 0 : secondes);
  // Sans cadre, le bouton n'a plus rien à attendre que la fin du feu.
  const delaiBouton = t(
    lignes.length > 0
      ? DELAI_PREMIERE_LIGNE + lignes.length * ECART_LIGNE + ECART_BOUTON
      : DELAI_CARTE + ECART_BOUTON,
  );

  // La fermeture marque le niveau vu et, à l'étape dédiée du tutoriel, fait
  // avancer vers la leçon des compétences — seule porte de sortie de
  // `niveau-celebration`.
  const fermer = () => {
    marquerNiveauVu();
    if (state.tutorielEtape === "niveau-celebration") {
      avancerTutoriel("competences-visite");
    }
    // La demande de notation part D'ICI, et pas de `marquerNiveauVu` dans le
    // GameContext : la logique de jeu n'a pas à connaître l'existence des
    // stores.
    //
    // POURQUOI LE NIVEAU 10. Le tutoriel rapporte ≥ 115 XP alors que le
    // niveau 1 est à 100 : le joueur passe niveau 1 À COUP SÛR pendant le
    // tutoriel, avant d'avoir rien vu du jeu. Le niveau 10 garantit un joueur
    // qui connaît Broc, sur un triomphe franc — c'est le contexte que les deux
    // plateformes recommandent.
    //
    // Rien n'est branché derrière : l'appel ne dit jamais si la boîte s'est
    // affichée, ni si le joueur a noté. Cf. `notation.ts`.
    if (niveauACelebrer === NIVEAU_NOTATION && !notationNiveauFaite()) {
      marquerNotationNiveauFaite();
      void demanderNotation();
    }
  };

  return (
    <div
      style={scrim}
      role="dialog"
      aria-modal="true"
      aria-label={tr(d.sheets.niveauAtteintAriaLabel, { n: niveauACelebrer })}
    >
      <div style={blocTitre}>
        <div
          className="broc-levelup-titre"
          style={{ ...titreNiveau, animationDelay: `${t(DELAI_TITRE)}s` }}
        >
          {tr(d.sheets.niveauNCelebration, { n: niveauACelebrer })}
        </div>
        {!mouvementReduit && (
          <div
            style={coucheArtifice}
            data-testid="levelup-confettis"
            aria-hidden="true"
          >
            {feu.map((e, i) => (
              <span
                key={i}
                className="broc-levelup-etincelle"
                style={{
                  position: "absolute",
                  left: e.bx - e.epaisseur / 2,
                  top: e.by - e.longueur / 2,
                  width: e.epaisseur,
                  height: e.longueur,
                  background: e.couleur,
                  borderRadius: e.epaisseur / 2,
                  animationDelay: `${DELAI_ARTIFICE + e.delai}s`,
                  ["--cx" as string]: `${e.dx}px`,
                  ["--cy" as string]: `${e.dy}px`,
                  ["--cr" as string]: `${e.rotation}deg`,
                }}
              />
            ))}
          </div>
        )}
      </div>
      {/* Le cadre ne monte QUE s'il a quelque chose à dire. En fin de
          parcours (plus aucun déblocage à venir, plafond de points atteint)
          les deux sections sont vides : un grand rectangle vert vide se lit
          comme un bug, alors que le chiffre et son feu se suffisent. */}
      {lignes.length > 0 && (
        <div
          className="broc-levelup-carte"
          style={{ ...carte, animationDelay: `${t(DELAI_CARTE)}s` }}
        >
          {lignes.map((l, i) => (
            <div
              key={l.key}
              className="broc-levelup-ligne"
              style={{
                ...ligneWrap,
                animationDelay: `${t(DELAI_PREMIERE_LIGNE + i * ECART_LIGNE)}s`,
              }}
            >
              {l.contenu}
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="broc-levelup-ligne"
        style={{ ...btnContinuer, animationDelay: `${delaiBouton}s` }}
        onClick={fermer}
      >
        {d.menu.continuer}
      </button>
    </div>
  );
}
