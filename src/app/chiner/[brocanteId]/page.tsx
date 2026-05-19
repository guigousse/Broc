import { BROCANTES } from "@/data/brocantes";
import ClientPage from "./ClientPage";

export function generateStaticParams() {
  return BROCANTES.map((b) => ({ brocanteId: b.id }));
}

export default function Page() {
  return <ClientPage />;
}
