/** Source de temps de confiance (non contrôlée par l'horloge du device). */
export interface TimeSource {
  /** Temps de confiance courant (epoch ms), ou null si indisponible (offline). */
  maintenant(): Promise<number | null>;
}

/** Endpoint par défaut (corps JSON `{ unixtime: <secondes> }`, CORS permissif). */
const TIME_API_URL = "https://worldtimeapi.org/api/timezone/Etc/UTC";

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
      const data = (await res.json()) as { unixtime?: unknown };
      const sec = typeof data.unixtime === "number" ? data.unixtime : NaN;
      const ms = sec * 1000;
      return Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }
}

// Singleton injectable — swap futur vers SupabaseTimeSource ici uniquement.
let instance: TimeSource | null = null;
export function getTimeSource(): TimeSource {
  if (!instance) instance = new HttpTimeSource();
  return instance;
}
