/**
 * Fabrication des trois prompts d'un épisode : l'étal (image), le plan 1 et
 * le plan 2 (vidéo). Module pur.
 */

/** Squelette d'action injecté selon le dénouement du plan 2. */
const SQUELETTES = {
  marchande:
    "The visitor does NOT buy yet: she haggles, offering a clearly lower price, still holding the deal open.",
  achete:
    "The visitor buys: she opens her purse, counts out banknotes and coins, hands them over the table and takes the item away with her.",
  repart:
    "The visitor declines: she puts the item back down on the cloth, gives a polite apologetic smile and walks out of frame to the side, leaving the standing space empty again.",
};

export function promptEtal(episode, blocs) {
  const liste = episode.items
    .map((item, i) => `${i + 1}. ${item.nom}`)
    .join("\n");

  return [
    blocs.decor,
    "",
    `Background variation for this shot: ${episode.fond}.`,
    "",
    "GOODS ON THE TABLE — the attached reference images show, in order, the exact objects to lay out on the cloth. Reproduce each of them faithfully in the illustration style of the scene: same shapes, same colours, same proportions. Arrange them naturally across the table top, slightly overlapping, as a real stallholder would, with the first one placed most prominently and fully visible.",
    liste,
    "",
    "The standing space just beyond the table must stay completely EMPTY: no person, no silhouette, no object there. Nothing must be added in the top street band either.",
  ].join("\n");
}

export function promptPlan1(episode, blocs) {
  return [
    "Animate the attached image. It is the first frame and the framing must never change.",
    blocs.camera,
    "",
    `ACTION: a visitor walks up to the stall and stops behind the table — ${episode.acheteur}. ${episode.plan1.action}. She looks up towards the camera and speaks to the stallholder.`,
    "",
    `DIALOGUE — the visitor says, in French, looking at the camera: "${episode.plan1.demande}"`,
    `Then the stallholder answers, in French: "${episode.plan1.prix}" — this reply is an OFF-SCREEN voice coming from behind the camera. The stallholder never appears, never enters the frame; no character on screen speaks that line and no mouth moves for it.`,
    "",
    blocs.ambiance,
  ].join("\n");
}

export function promptPlan2(episode, blocs) {
  return [
    "Animate the attached image. It is the first frame and it continues the previous shot without any break: same visitor, same clothes, same pose, same objects in the same places, same light. The framing must never change.",
    blocs.camera,
    "",
    `ACTION: ${SQUELETTES[episode.plan2.denouement]} ${episode.plan2.action}.`,
    "",
    `DIALOGUE — the visitor says, in French, looking at the camera: "${episode.plan2.replique}"`,
    "The stallholder does not answer and never appears in frame.",
    "",
    blocs.ambiance,
  ].join("\n");
}
