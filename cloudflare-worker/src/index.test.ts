import { describe, expect, it } from "vitest";
import { derEcdsaToRaw, validateAnalysis } from "./index";

describe("validateAnalysis", () => {
  it("normalizes model output to safe bounds", () => {
    const result = validateAnalysis({
      interpretation: "A".repeat(2500),
      primaryEmotion: "Huzur",
      moodScore: 42,
      archetypes: ["Gölge", "Kahraman", "Bilge", "Anima", "Kendilik", "Fazla"],
      gorsel_betimleme: "moonlit forest",
    });

    expect(result.interpretation).toHaveLength(2400);
    expect(result.moodScore).toBe(10);
    expect(result.archetypes).toHaveLength(5);
  });

  it("rejects malformed model output", () => {
    expect(() => validateAnalysis({ interpretation: "missing fields" })).toThrow("INVALID_AI_RESPONSE");
  });
});

describe("derEcdsaToRaw", () => {
  it("converts a DER encoded P-256 signature to 64-byte WebCrypto form", () => {
    const r = new Uint8Array(32).fill(1);
    const s = new Uint8Array(32).fill(2);
    const der = new Uint8Array([0x30, 0x44, 0x02, 0x20, ...r, 0x02, 0x20, ...s]);
    const raw = derEcdsaToRaw(der);
    expect(raw).toHaveLength(64);
    expect(Array.from(raw.slice(0, 32))).toEqual(Array.from(r));
    expect(Array.from(raw.slice(32))).toEqual(Array.from(s));
  });
});
