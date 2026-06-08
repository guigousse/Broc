"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function VitrineBrocantePage() {
  const router = useRouter();
  const params = useParams<{ brocanteId: string }>();
  useEffect(() => {
    // Page en cours de réécriture (Task 16 du plan vente-coffre-camion).
    void params;
    void router;
  }, [params, router]);
  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100dvh",
        fontFamily: "var(--font-mono)",
        color: "var(--ink-500)",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontSize: 12,
      }}
    >
      — page de préparation en cours de réécriture —
    </main>
  );
}
