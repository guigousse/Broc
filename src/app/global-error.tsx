"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

// global-error remplace tout le layout racine : il doit fournir <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ margin: 0 }}>
        <ErrorScreen error={error} reset={reset} />
      </body>
    </html>
  );
}
