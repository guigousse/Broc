// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import { ReglagesModal } from "./ReglagesModal";

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

describe("ReglagesModal — sélecteur de langue", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.stubGlobal("navigator", { language: "fr-FR" });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("propose les 4 langues dans un menu déroulant (autonymes)", () => {
    render(
      <LangueProvider>
        <ReglagesModal open onClose={() => {}} />
      </LangueProvider>,
    );
    const select = screen.getByRole("combobox", { name: "Langue" });
    const options = [...select.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toEqual(["Français", "English", "Español", "Ελληνικά"]);
  });

  it("changer la valeur bascule la langue de l'UI", () => {
    render(
      <LangueProvider>
        <ReglagesModal open onClose={() => {}} />
      </LangueProvider>,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Langue" }), {
      target: { value: "el" },
    });
    expect(screen.getByRole("combobox", { name: "Γλώσσα" })).toBeTruthy();
  });
});
