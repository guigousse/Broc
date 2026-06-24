/** Source de temps de confiance (non contrôlée par l'horloge du device). */
export interface TimeSource {
  /** Temps de confiance courant (epoch ms), ou null si indisponible (offline). */
  maintenant(): Promise<number | null>;
}

/**
 * Endpoint par défaut : timeapi.io en UTC, CORS permissif (`Access-Control-Allow-Origin: *`).
 * Réponse : `{ year, month, day, hour, minute, seconds, milliSeconds, ... }` (heure UTC).
 * (worldtimeapi.org, l'ancien endpoint, est hors service.)
 */
const TIME_API_URL = "https://timeapi.io/api/time/current/zone?timeZone=UTC";

/** Champs date/heure renvoyés par timeapi.io (heure UTC). */
interface TimeApiPayload {
  year?: unknown;
  month?: unknown;
  day?: unknown;
  hour?: unknown;
  minute?: unknown;
  seconds?: unknown;
  milliSeconds?: unknown;
}

export class HttpTimeSource implements TimeSource {
  constructor(
    private readonly url: string = TIME_API_URL,
    private readonly timeoutMs: number = 4000,
  ) {}

  async maintenant(): Promise<number | null> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
      const res = await fetch(this.url, { cache: "no-store", signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) return null;
      return parseTimeApi((await res.json()) as TimeApiPayload);
    } catch {
      return null;
    }
  }
}

/**
 * Construit un epoch ms à partir des champs UTC de timeapi.io. Utilise `Date.UTC`
 * (et non un parse de chaîne ISO sans suffixe `Z`, qui serait interprété en
 * fuseau local). Renvoie null si un champ obligatoire manque ou n'est pas un nombre.
 */
function parseTimeApi(data: TimeApiPayload): number | null {
  const champs = [data.year, data.month, data.day, data.hour, data.minute, data.seconds];
  if (!champs.every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  const ms = typeof data.milliSeconds === "number" ? data.milliSeconds : 0;
  const epoch = Date.UTC(
    data.year as number,
    (data.month as number) - 1, // Date.UTC attend un mois 0-indexé.
    data.day as number,
    data.hour as number,
    data.minute as number,
    data.seconds as number,
    ms,
  );
  return Number.isFinite(epoch) ? epoch : null;
}

// Singleton injectable — swap futur vers SupabaseTimeSource ici uniquement.
let instance: TimeSource | null = null;
export function getTimeSource(): TimeSource {
  if (!instance) instance = new HttpTimeSource();
  return instance;
}
