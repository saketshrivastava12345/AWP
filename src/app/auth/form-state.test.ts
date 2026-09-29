import { describe, expect, it } from "vitest";
import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthWeakPasswordError,
} from "@supabase/supabase-js";
import { formError, formSuccess, INITIAL_FORM_STATE } from "./form-state";
import { classifyAuthError } from "./errors";

describe("classifyAuthError", () => {
  it("treats network failures and 5xx as unavailable", () => {
    expect(classifyAuthError(new AuthRetryableFetchError("fetch failed", 0)).kind).toBe(
      "unavailable",
    );
    expect(
      classifyAuthError(new AuthApiError("boom", 500, "unexpected_failure")).kind,
    ).toBe("unavailable");
    expect(classifyAuthError(new Error("socket hang up")).kind).toBe("unavailable");
    expect(classifyAuthError("weird").kind).toBe("unavailable");
  });

  it("recognises rate limits", () => {
    expect(
      classifyAuthError(new AuthApiError("slow down", 429, "over_request_rate_limit"))
        .kind,
    ).toBe("rate_limited");
    expect(
      classifyAuthError(new AuthApiError("wait", 400, "over_email_send_rate_limit")).kind,
    ).toBe("rate_limited");
  });

  it("recognises weak passwords", () => {
    expect(
      classifyAuthError(new AuthWeakPasswordError("weak", 422, ["length"])).kind,
    ).toBe("weak_password");
    expect(classifyAuthError(new AuthApiError("weak", 422, "weak_password")).kind).toBe(
      "weak_password",
    );
  });

  it("reports other 4xx as rejected, with the code for the caller to decide", () => {
    expect(
      classifyAuthError(new AuthApiError("nope", 400, "invalid_credentials")),
    ).toEqual({
      kind: "rejected",
      code: "invalid_credentials",
    });
    expect(
      classifyAuthError(new AuthApiError("exists", 422, "user_already_exists")),
    ).toEqual({
      kind: "rejected",
      code: "user_already_exists",
    });
  });
});

describe("form state helpers", () => {
  it("builds error and success states", () => {
    expect(INITIAL_FORM_STATE.status).toBe("idle");
    expect(formError("x", { values: { email: "a@b.co" } })).toEqual({
      status: "error",
      message: "x",
      fieldErrors: {},
      values: { email: "a@b.co" },
    });
    expect(formSuccess("ok")).toEqual({
      status: "success",
      message: "ok",
      fieldErrors: {},
      values: {},
    });
  });
});
