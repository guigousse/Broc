"use client";

/**
 * Bande d'onglets en tête de la Réserve (Stockage | Atelier).
 *
 * Elle REMPLACE le titre centré `— STOCKAGE —` de la carte du haut au lieu
 * de s'y ajouter : le titre devient redondant dès qu'un onglet porte le même
 * mot.
 *
 * Ce sont des LANGUETTES posées DERRIÈRE la carte : coins supérieurs
 * arrondis, cadre laiton sur trois côtés, et le quatrième — le bas — n'existe
 * pas parce qu'il disparaît sous elle. Le cadre art déco de la carte n'est
 * donc jamais rompu, et son ombre portée tombe sur les languettes, ce qui
 * creuse l'illusion sans une ligne de CSS de plus.
 *
 * Actif et inactif ne se distinguent que par la couleur, puisque le cadre ne
 * s'interrompt nulle part : l'actif sur le papier clair de la carte, l'inactif
 * sur un papier plus sombre, en retrait.
 *
 * Le cadenas de l'Atelier vivait dans la barre du bas ; il vit ici depuis la
 * fusion, avec exactement le même vocabulaire (icône grisée, cadenas laiton,
 * opacité réduite, un toast au tap et aucune navigation) pour que le joueur
 * reconnaisse la règle.
 */

import { Lock } from "lucide-react";
import type { CSSProperties } from "react";
import { Badge } from "@/components/mobile/Badge";
import {
  EPAISSEUR_CADRE_CARTE,
  RECOUVREMENT_ONGLETS,
  Z_CARTE,
} from "@/components/mobile/floating-room/FloatingRoomOverlay";
import { useLangue } from "@/lib/i18n/LangueContext";

export type OngletReserve = "stockage" | "atelier";

interface ReserveTabsProps {
  actif: OngletReserve;
  /** Faux tant que le joueur n'a pas sa première compétence Réparer. */
  atelierOuvert: boolean;
  /** Restaurations prêtes à récupérer. Ignoré si l'atelier est fermé. */
  badgeAtelier: number;
  /**
   * Mini-tuto Atelier : main pointeuse au-dessus de l'onglet. La guidance se
   * fait en deux temps depuis la fusion — la barre du bas amène à la Réserve,
   * cette main amène à l'onglet. Jamais sur l'onglet déjà actif.
   *
   * Variante HORIZONTALE (`tuto-main`, pas `tuto-main-haut`) : cette rangée
   * vit dans la zone `onglets` de `FloatingRoomOverlay`, tout en haut de son
   * conteneur racine (`wrap`) — qui porte `overflow: hidden`. Les languettes
   * commencent donc au ras du bord rogné : un doigt posé au-dessus
   * (`::after` à -62px) y serait tranché (piège déjà payé ailleurs dans ce
   * dépôt). L'onglet Atelier est la languette de DROITE : le doigt par défaut
   * se pose à sa gauche et reste dans la hauteur du bouton. Mesuré après le
   * passage en languettes : doigt x[110,198] y[65,101] dans un châssis
   * x[0,390] y[50,785] — intact. Le plan nommait une variante BASSE en
   * repli ; elle n'existe pas dans ce dépôt (`globals.css` ne définit que
   * `tuto-main`, `tuto-main-haut`, `tuto-main-droite` et `tuto-main-swipe`).
   */
  mainSurAtelier?: boolean;
  onChoisir: (onglet: OngletReserve) => void;
  onVerrou: () => void;
}

/**
 * Retrait latéral des languettes. Il doit DÉPASSER le rayon de la carte
 * (`--radius-card`, 8 px) : le remplissage de la languette active est un
 * rectangle, et posé sur un coin arrondi il vient le combler par-derrière —
 * le coin redevient carré. En s'arrêtant avant les coins, les languettes les
 * laissent entiers, et le liseré haut de la carte reparaît de part et
 * d'autre : c'est aussi ce qui les fait lire comme des onglets de classeur
 * plutôt que comme un bandeau.
 */
const RETRAIT_LANGUETTES = 14;

const rangee: CSSProperties = {
  display: "flex",
  // Deux languettes SÉPARÉES : la gouttière est ce qui les fait lire comme
  // deux onglets plutôt que comme un sélecteur segmenté.
  gap: 6,
  paddingLeft: RETRAIT_LANGUETTES,
  paddingRight: RETRAIT_LANGUETTES,
};

const liseret = "1px solid var(--brass-500)";

/* Le BOUTON n'est que la cible tactile : pleine hauteur, sans liseré, et —
   quand il est actif — rempli du papier de la carte pour en noyer le liseré
   haut. La FACE porte tout l'habillage visible. Deux éléments, parce qu'un
   liseré porté par le bouton descendrait dans les 16 px cachés et planterait
   deux traits verticaux au milieu de la carte (constaté à la loupe). */
function ongletStyle(actif: boolean, verrouille: boolean): CSSProperties {
  return {
    position: "relative",
    // L'ACTIF passe par-dessus la carte : son fond — celui de la carte —
    // recouvre le liseré haut et l'arête entre l'onglet et la page disparaît.
    // L'inactif reste dessous, traversé par le cadre.
    zIndex: actif ? Z_CARTE + 1 : undefined,
    flex: 1,
    display: "flex",
    alignItems: "stretch",
    minHeight: "var(--tap-min)",
    padding: 0,
    // La face déborde SOUS le bord haut de la carte, de l'épaisseur exacte
    // du feuilletage laiton : ses deux traits traversent alors les deux
    // traits du cadre et s'y raccordent. Sans ce débord, ils s'arrêtaient en
    // l'air un pixel au-dessus — la cassure visible à la loupe.
    paddingBottom: RECOUVREMENT_ONGLETS - EPAISSEUR_CADRE_CARTE,
    border: "none",
    background: actif ? "var(--paper-100)" : "transparent",
    cursor: "pointer",
    opacity: verrouille ? 0.55 : 1,
    minWidth: 0,
  };
}

/* La carte dessine un liseré DOUBLE : laiton, 2 px de papier, laiton (son
   `border` plus deux ombres internes). Une languette à trait simple ferait
   buter cette double ligne au lieu de la prolonger — c'est la cassure qu'on
   voit à la jonction. La face reproduit donc le même feuilletage, en deux
   éléments imbriqués : c'est la seule façon d'obtenir la double ligne SANS
   la refermer en bas, là où la languette donne sur la page. */
function faceStyle(): CSSProperties {
  return {
    flex: 1,
    display: "flex",
    // La bande de papier qui sépare les deux liserés — celle du cadre. Sur
    // trois côtés seulement : 2 px en bas retiendraient le trait intérieur à
    // mi-hauteur du feuilletage, et il finirait en l'air au lieu de rejoindre
    // le trait intérieur de la carte.
    paddingTop: 2,
    paddingRight: 2,
    paddingBottom: 0,
    paddingLeft: 2,
    borderTop: liseret,
    borderRight: liseret,
    borderLeft: liseret,
    borderTopLeftRadius: "var(--radius-card)",
    borderTopRightRadius: "var(--radius-card)",
    background: "var(--paper-100)",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

function faceInterieureStyle(actif: boolean): CSSProperties {
  return {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 5,
    paddingRight: 6,
    paddingBottom: 5,
    paddingLeft: 6,
    borderTop: liseret,
    borderRight: liseret,
    borderLeft: liseret,
    // Rayon intérieur = rayon de la carte moins l'épaisseur du feuilletage,
    // pour que les deux arcs restent concentriques.
    borderTopLeftRadius: "calc(var(--radius-card) - 3px)",
    borderTopRightRadius: "calc(var(--radius-card) - 3px)",
    background: actif ? "var(--paper-100)" : "var(--paper-200)",
    color: actif ? "var(--forest-800)" : "var(--brass-700)",
    fontFamily: "var(--font-display)",
    fontSize: 12,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

const cadenas: CSSProperties = {
  color: "var(--brass-700)",
  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
  flexShrink: 0,
};

export function ReserveTabs({
  actif,
  atelierOuvert,
  badgeAtelier,
  mainSurAtelier = false,
  onChoisir,
  onVerrou,
}: ReserveTabsProps) {
  const { d } = useLangue();
  // Aucun badge sous un cadenas : un compteur clignoterait derrière une porte
  // fermée (même règle que la barre du bas).
  const badge = atelierOuvert ? badgeAtelier : 0;

  return (
    <div style={rangee}>
      <button
        type="button"
        aria-current={actif === "stockage" ? "page" : undefined}
        aria-label={d.chrome.onglets.stockage}
        onClick={() => {
          if (actif !== "stockage") onChoisir("stockage");
        }}
        style={ongletStyle(actif === "stockage", false)}
      >
        <span style={faceStyle()}>
          <span style={faceInterieureStyle(actif === "stockage")}>
            {d.chrome.onglets.stockage}
          </span>
        </span>
      </button>

      <button
        type="button"
        data-tuto-coach="reserve-onglet-atelier"
        aria-current={actif === "atelier" ? "page" : undefined}
        aria-disabled={atelierOuvert ? undefined : true}
        aria-label={
          atelierOuvert
            ? d.chrome.onglets.atelier
            : `${d.chrome.onglets.atelier} — ${d.chrome.ongletVerrouille}`
        }
        onClick={() => {
          if (!atelierOuvert) {
            onVerrou();
            return;
          }
          if (actif !== "atelier") onChoisir("atelier");
        }}
        // `atelierOuvert` en premier : une main posée sur un onglet CADENASSÉ
        // désignerait un bouton qui ne répond que par un refus (toast). La
        // visite guidée n'est armée qu'à la chute du cadenas, mais une save
        // bricolée ou un futur réordonnancement des déblocages suffirait.
        className={
          atelierOuvert && mainSurAtelier && actif !== "atelier"
            ? "tuto-main"
            : undefined
        }
        style={ongletStyle(actif === "atelier", !atelierOuvert)}
      >
        <span style={faceStyle()}>
          <span style={faceInterieureStyle(actif === "atelier")}>
            {!atelierOuvert && <Lock size={13} strokeWidth={2.6} style={cadenas} />}
            {d.chrome.onglets.atelier}
            {badge > 0 && <Badge count={badge} />}
          </span>
        </span>
      </button>
    </div>
  );
}
