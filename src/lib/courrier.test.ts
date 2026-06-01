// src/lib/courrier.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { HuissierEvent, Courrier } from "@/types/game";
import { migrerCourriers, creerCourrierHuissier } from "@/lib/courrier";

const baseHuissier: HuissierEvent = {
  jour: 12,
  detteAvantSaisie: -85,
  saisies: [
    { type: "inventaire", nom: "Vase ancien", valeur: 60, montantRecupere: 30 },
  ],
  budgetApres: -55,
};

test("creerCourrierHuissier produit un courrier non lu avec id déterministe", () => {
  const c = creerCourrierHuissier(baseHuissier);
  assert.equal(c.type, "huissier");
  assert.equal(c.lu, false);
  assert.equal(c.jourRecu, 12);
  assert.equal(c.id, "huissier-12");
  assert.equal(c.payload.type, "huissier");
  assert.equal(c.payload.detteAvantSaisie, -85);
});

test("migrerCourriers conserve courriers existants si présents", () => {
  const existing: Courrier[] = [
    {
      id: "huissier-5",
      type: "huissier",
      jourRecu: 5,
      lu: true,
      payload: { type: "huissier", detteAvantSaisie: -10, saisies: [], budgetApres: 0 },
    },
  ];
  const result = migrerCourriers(existing, null);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "huissier-5");
});

test("migrerCourriers convertit dernierHuissier non null", () => {
  const result = migrerCourriers(undefined, baseHuissier);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "huissier-12");
  assert.equal(result[0].lu, false);
});

test("migrerCourriers retourne tableau vide si rien", () => {
  const result = migrerCourriers(undefined, null);
  assert.deepEqual(result, []);
});

test("migrerCourriers ne duplique pas si dernierHuissier déjà migré", () => {
  const existing: Courrier[] = [
    {
      id: "huissier-12",
      type: "huissier",
      jourRecu: 12,
      lu: false,
      payload: { type: "huissier", detteAvantSaisie: -85, saisies: [], budgetApres: -55 },
    },
  ];
  const result = migrerCourriers(existing, baseHuissier);
  assert.equal(result.length, 1);
});
