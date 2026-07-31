/** Sépare le premier emoji d'un titre localisé (« Atout 🔍 Le Flair »). */
export function extraireEmoji(titre: string): { emoji: string | null; texte: string } {
  const m = titre.match(/\p{Extended_Pictographic}/u);
  if (!m) return { emoji: null, texte: titre };
  return {
    emoji: m[0],
    texte: titre.replace(m[0], "").replace(/\s{2,}/g, " ").trim(),
  };
}
