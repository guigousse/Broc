import { describe, expect, it } from "vitest";
import { vinylAudioUrl, vinylHasAudio } from "./vinylesAudio";

describe("vinylesAudio — les 3 jazz de l'écran titre", () => {
  it.each([
    "mus.33tours_jazz_1",
    "mus.33tours_jazz_2",
    "mus.33tours_jazz_3",
  ])("%s a un audio jouable, hébergé en local", (id) => {
    expect(vinylHasAudio(id)).toBe(true);
    expect(vinylAudioUrl(id)).toBe(`/sounds/vinyles/${id}.mp3`);
  });
});
