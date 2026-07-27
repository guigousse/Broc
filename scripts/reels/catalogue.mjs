/**
 * Lecture de docs/items-catalogue.csv.
 * Module pur : il reçoit le texte du fichier, il ne le lit pas lui-même.
 */

/**
 * Découpage CSV avec séparateur « ; », champs éventuellement entre
 * guillemets doubles, guillemet littéral échappé en le doublant.
 * Le BOM UTF-8 éventuel est retiré.
 */
export function analyserCsv(texte) {
  const source = texte.replace(/^﻿/, "");
  const lignes = [];
  let cellules = [];
  let cellule = "";
  let entreGuillemets = false;

  for (let i = 0; i < source.length; i++) {
    const c = source[i];

    if (entreGuillemets) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          cellule += '"';
          i++;
        } else {
          entreGuillemets = false;
        }
      } else {
        cellule += c;
      }
      continue;
    }

    if (c === '"' && cellule === "") {
      entreGuillemets = true;
    } else if (c === ";") {
      cellules.push(cellule);
      cellule = "";
    } else if (c === "\n") {
      cellules.push(cellule);
      lignes.push(cellules);
      cellules = [];
      cellule = "";
    } else if (c !== "\r") {
      cellule += c;
    }
  }

  if (cellule !== "" || cellules.length > 0) {
    cellules.push(cellule);
    lignes.push(cellules);
  }

  // Une ligne vide donne une unique cellule vide : on l'écarte.
  return lignes.filter((l) => l.some((cel) => cel !== ""));
}

/**
 * Indexe le catalogue par templateId. Seules les colonnes utiles à la
 * pipeline sont retenues — la cote « très bon état » sert aux chutes.
 */
export function chargerCatalogue(texte) {
  const [entete, ...corps] = analyserCsv(texte);
  const colonne = (nom) => entete.indexOf(nom);
  const iId = colonne("templateId");
  const iNom = colonne("nom");
  const iCategorie = colonne("categorie");
  const iRarete = colonne("rarete");
  const iCote = colonne("prix_TresBon");

  const catalogue = new Map();
  for (const ligne of corps) {
    const id = ligne[iId];
    if (!id) continue;
    catalogue.set(id, {
      id,
      nom: ligne[iNom],
      categorie: ligne[iCategorie],
      rarete: ligne[iRarete],
      prixTresBon: Number(ligne[iCote]),
    });
  }
  return catalogue;
}
