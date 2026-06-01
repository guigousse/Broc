import { useRef, useCallback } from "react";
import { audioManager } from "@/lib/audio/audioManager";

const TICK_INTERVAL_MS = 30;

/**
 * Renvoie une fonction `tick()` qui joue audioManager.playTick() au plus
 * une fois toutes les `TICK_INTERVAL_MS` ms. Sert au tic de drag.
 */
export function useTickSound(): () => void {
  const lastRef = useRef(0);
  return useCallback(() => {
    const now = performance.now();
    if (now - lastRef.current < TICK_INTERVAL_MS) return;
    lastRef.current = now;
    audioManager.playTick();
  }, []);
}
