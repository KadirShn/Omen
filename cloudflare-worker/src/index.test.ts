import { describe, expect, it } from "vitest";
import { calculateRefreshedCredits, requireVerifiedEmail, validateAnalysis } from "./index";

describe("validateAnalysis", () => {
  it("normalizes model output to safe bounds", () => {
    const result = validateAnalysis({
      interpretation: "A".repeat(2500),
      primaryEmotion: "Huzur",
      moodScore: 42,
      archetypes: ["Gölge", "Kahraman", "Bilge", "Anima", "Kendilik", "Fazla"],
      symbols: [{ name: "Kapı", meaning: "Yeni bir eşiği temsil edebilir." }],
      reflectionQuestion: "Hangi değişime hazırlanıyorsun?",
      actionStep: "Bugün bir cümlelik not al.",
      recurringPattern: "Önceki rüyayla ortak bir kapı teması var.",
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

describe("requireVerifiedEmail", () => {
  it("allows anonymous users and verified email accounts", () => {
    expect(() => requireVerifiedEmail({
      uid: "anonymous",
      emailVerified: false,
      isAnonymous: true,
      idToken: "token",
    })).not.toThrow();
    expect(() => requireVerifiedEmail({
      uid: "verified",
      email: "verified@example.com",
      emailVerified: true,
      isAnonymous: false,
      idToken: "token",
    })).not.toThrow();
  });

  it("blocks an unverified email account", () => {
    expect(() => requireVerifiedEmail({
      uid: "unverified",
      email: "unverified@example.com",
      emailVerified: false,
      isAnonymous: false,
      idToken: "token",
    })).toThrow("EMAIL_NOT_VERIFIED");
  });
});

describe("calculateRefreshedCredits", () => {
  it("keeps anonymous accounts at one credit without a daily refill", () => {
    expect(calculateRefreshedCredits(0, true, false, "2026-08-07", "2026-08-08")).toBe(0);
    expect(calculateRefreshedCredits(8, true, false, "2026-08-07", "2026-08-08")).toBe(1);
  });

  it("refills verified accounts once per UTC day and caps the balance at two", () => {
    expect(calculateRefreshedCredits(0, false, false, "2026-08-07", "2026-08-08")).toBe(1);
    expect(calculateRefreshedCredits(1, false, false, "2026-08-08", "2026-08-08")).toBe(1);
    expect(calculateRefreshedCredits(5, false, false, "2026-08-07", "2026-08-08")).toBe(2);
  });

  it("does not limit developer accounts", () => {
    expect(calculateRefreshedCredits(99, false, true, "", "2026-08-08")).toBe(99);
  });
});
