import { describe, expect, it } from "vitest";
import { loginHref, safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(safeNextPath("/favorites")).toBe("/favorites");
    expect(safeNextPath("/cars/porsche/911/gt3")).toBe("/cars/porsche/911/gt3");
    expect(safeNextPath("/cars?fuel=electric&sort=power#grid")).toBe(
      "/cars?fuel=electric&sort=power#grid",
    );
    expect(safeNextPath("/account/password")).toBe("/account/password");
  });

  it.each([
    "//evil.com",
    "//evil.com/favorites",
    "/\\evil.com",
    "/\\/evil.com",
    "\\\\evil.com",
    "https://evil.com",
    "http://localhost:3000/favorites",
    "javascript:alert(1)",
    "evil.com",
    "favorites",
    "/\t/evil.com",
    "/\n/evil.com",
    "/%0a/evil.com".replace("%0a", "\n"),
    "/cars\\..\\..",
    "",
    "   ",
  ])("rejects %j", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it.each([
    "/login",
    "/login?next=/login",
    "/login/forgot",
    "/LOGIN",
    "/auth/confirm?token_hash=x",
    "/auth",
    "/%6Cogin",
    "/cars/../login",
    "/./auth/confirm",
  ])("will not return to the auth pages: %j", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it("does not treat look-alike paths as auth pages", () => {
    expect(safeNextPath("/login-help")).toBe("/login-help");
    expect(safeNextPath("/authors")).toBe("/authors");
  });

  it("normalises dot segments", () => {
    expect(safeNextPath("/cars/./porsche/../ferrari")).toBe("/cars/ferrari");
  });

  it("rejects non-strings and overlong input", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(["/favorites"])).toBe("/");
    expect(safeNextPath(`/${"a".repeat(600)}`)).toBe("/");
  });

  it("uses the given fallback", () => {
    expect(safeNextPath("//evil.com", "/account/password")).toBe("/account/password");
  });
});

describe("loginHref", () => {
  it("carries a safe return path and drops an unsafe one", () => {
    expect(loginHref("/favorites")).toBe("/login?next=%2Ffavorites");
    expect(loginHref("//evil.com")).toBe("/login");
    expect(loginHref("/")).toBe("/login");
    expect(loginHref(null)).toBe("/login");
  });
});
