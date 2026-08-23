// Route de l'onglet Stockage de la Réserve. Le contenu vit dans
// components/mobile/reserve : /stockage et /atelier rendent la même
// coquille, seul l'onglet actif change (cf. spec 2026-08-23).
import { StockageContenu } from "@/components/mobile/reserve/StockageContenu";

export default function StockagePage() {
  return <StockageContenu />;
}
