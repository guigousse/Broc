// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import { ToastProvider } from "@/components/ui/Toast";
import { ReglagesModal } from "./ReglagesModal";

// Fichier de test dédié : `vi.mock` est hissé par fichier, et le test
// historique de ReglagesModal ne mocke ni la plateforme ni la façade AdMob.
const etat = vi.hoisted(() => ({
  plateforme: null as "ios" | "android" | null,
  requis: false,
  montrer: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    audioPrefs: { volume: 1, musique: true, effets: true, ambiance: true },
    setAudioPref: vi.fn(),
    setVolume: vi.fn(),
    playClick: vi.fn(),
    tailleFonte: "normal",
    setTailleFonte: vi.fn(),
  }),
}));
vi.mock("@/lib/notifications", () => ({
  demanderPermission: vi.fn(),
  notificationsDisponibles: () => false,
  permissionAccordee: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/notifications/prefs", () => ({
  notifsActives: () => false,
  setNotifsActives: vi.fn(),
}));
vi.mock("@/lib/iap/iapProvider", () => ({
  getIapProvider: () => ({ restaurer: async () => false }),
  achatDisponible: () => true,
}));
vi.mock("@/lib/plateforme", () => ({
  plateformeNative: () => etat.plateforme,
  tauriDisponible: () => etat.plateforme !== null,
  tauriIosDisponible: () => etat.plateforme === "ios",
  tauriAndroidDisponible: () => etat.plateforme === "android",
}));
vi.mock("@/lib/ads/adMobProvider", () => ({
  adMobDisponible: () => etat.plateforme !== null,
  AdMobAdProvider: class {},
  optionsConfidentialiteRequises: async () => etat.requis,
  montrerOptionsConfidentialite: () => etat.montrer(),
}));

const ouvrir = () =>
  render(
    <LangueProvider>
      <ToastProvider>
        <ReglagesModal open onClose={() => {}} />
      </ToastProvider>
    </LangueProvider>,
  );

describe("ReglagesModal — options de confidentialité (UMP, Android)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.stubGlobal("navigator", { language: "fr-FR" });
    etat.plateforme = "android";
    etat.requis = true;
    etat.montrer.mockReset();
    etat.montrer.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("sur Android, quand UMP l'exige : la section et son bouton sont là", async () => {
    ouvrir();
    expect(
      await screen.findByRole("button", { name: /Options de confidentialité/ }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Confidentialité" })).toBeTruthy();
  });

  it("le bouton rouvre le formulaire natif", async () => {
    ouvrir();
    fireEvent.click(await screen.findByRole("button", { name: /Options de confidentialité/ }));
    await waitFor(() => expect(etat.montrer).toHaveBeenCalledTimes(1));
  });

  it("en erreur du natif, le toast rouge des pubs s'affiche", async () => {
    etat.montrer.mockRejectedValue(new Error("formulaire indisponible"));
    ouvrir();
    fireEvent.click(await screen.findByRole("button", { name: /Options de confidentialité/ }));
    expect(await screen.findByText(/Erreur lors de la pub/)).toBeTruthy();
  });

  it("sur Android, quand UMP ne l'exige pas : rien", async () => {
    etat.requis = false;
    ouvrir();
    // La section Achats (toujours rendue ici) prouve que la modale a fini de
    // se peindre avant qu'on affirme l'absence.
    await screen.findByRole("button", { name: /Restaurer les achats/ });
    expect(screen.queryByRole("button", { name: /Options de confidentialité/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Confidentialité" })).toBeNull();
  });

  it("sur iOS : rien, même si UMP l'exigeait (lot séparé)", async () => {
    etat.plateforme = "ios";
    ouvrir();
    await screen.findByRole("button", { name: /Restaurer les achats/ });
    expect(screen.queryByRole("heading", { name: "Confidentialité" })).toBeNull();
  });

  it("hors Tauri (web/dev) : rien", async () => {
    etat.plateforme = null;
    ouvrir();
    await screen.findByRole("button", { name: /Restaurer les achats/ });
    expect(screen.queryByRole("heading", { name: "Confidentialité" })).toBeNull();
  });
});
