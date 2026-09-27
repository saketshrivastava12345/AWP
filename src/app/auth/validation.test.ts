import { describe, expect, it } from "vitest";
import {
  isTokenHash,
  parseEmailLinkType,
  readField,
  validateDisplayName,
  validateEmail,
  validateExistingPassword,
  validateNewPassword,
} from "./validation";

describe("validateEmail", () => {
  it("trims and accepts ordinary addresses", () => {
    expect(validateEmail("  user@aurix.test ")).toEqual({
      ok: true,
      value: "user@aurix.test",
    });
  });

  it.each(["", "   ", "user", "user@", "@aurix.test", "a b@c.d", "user@localhost"])(
    "rejects %j",
    (value) => {
      expect(validateEmail(value).ok).toBe(false);
    },
  );

  it("rejects absurd lengths", () => {
    expect(validateEmail(`${"a".repeat(250)}@aurix.test`).ok).toBe(false);
  });
});

describe("validateNewPassword", () => {
  it("requires at least 8 characters", () => {
    expect(validateNewPassword("1234567").ok).toBe(false);
    expect(validateNewPassword("12345678")).toEqual({ ok: true, value: "12345678" });
  });

  it("never trims: spaces count", () => {
    expect(validateNewPassword("  pass  ")).toEqual({ ok: true, value: "  pass  " });
  });

  it("enforces the 72-byte bcrypt limit in bytes, not characters", () => {
    expect(validateNewPassword("a".repeat(72)).ok).toBe(true);
    expect(validateNewPassword("a".repeat(73)).ok).toBe(false);
    // 30 × "é" is 30 characters but 60 bytes; 40 of them is 80 bytes.
    expect(validateNewPassword("é".repeat(30)).ok).toBe(true);
    expect(validateNewPassword("é".repeat(40)).ok).toBe(false);
  });
});

describe("validateExistingPassword", () => {
  it("requires something, bounded", () => {
    expect(validateExistingPassword("").ok).toBe(false);
    expect(validateExistingPassword("x").ok).toBe(true);
    expect(validateExistingPassword("x".repeat(2000)).ok).toBe(false);
  });
});

describe("validateDisplayName", () => {
  it("collapses whitespace and trims", () => {
    expect(validateDisplayName("  Saket   Shrivastava ")).toEqual({
      ok: true,
      value: "Saket Shrivastava",
    });
  });

  it("strips control and invisible formatting characters", () => {
    expect(validateDisplayName("Ad\u0000min‮​")).toEqual({ ok: true, value: "Admin" });
  });

  it("rejects empty and overlong names", () => {
    expect(validateDisplayName("   ").ok).toBe(false);
    expect(validateDisplayName("​").ok).toBe(false);
    expect(validateDisplayName("x".repeat(51)).ok).toBe(false);
    expect(validateDisplayName("x".repeat(50)).ok).toBe(true);
  });

  it("counts characters, not UTF-16 units", () => {
    expect(validateDisplayName("🏎".repeat(50)).ok).toBe(true);
  });
});

describe("email link parameters", () => {
  it("accepts only Supabase's link types", () => {
    expect(parseEmailLinkType("recovery")).toBe("recovery");
    expect(parseEmailLinkType("signup")).toBe("signup");
    expect(parseEmailLinkType("admin")).toBeNull();
    expect(parseEmailLinkType(undefined)).toBeNull();
  });

  it("accepts only plausible token hashes", () => {
    expect(isTokenHash("pkce_0123456789abcdef")).toBe(true);
    expect(isTokenHash("a".repeat(56))).toBe(true);
    expect(isTokenHash("short")).toBe(false);
    expect(isTokenHash("has space here")).toBe(false);
    expect(isTokenHash("<script>")).toBe(false);
    expect(isTokenHash(42)).toBe(false);
  });
});

describe("readField", () => {
  it("reads strings and ignores files and absences", () => {
    const form = new FormData();
    form.set("email", "user@aurix.test");
    form.set("file", new Blob(["x"]), "x.txt");
    expect(readField(form, "email")).toBe("user@aurix.test");
    expect(readField(form, "file")).toBe("");
    expect(readField(form, "missing")).toBe("");
  });
});
