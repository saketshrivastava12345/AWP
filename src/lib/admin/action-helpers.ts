import "server-only";

import { unstable_rethrow } from "next/navigation";
import { requireAdmin, type AdminContext } from "./auth";
import { failed, NOT_AUTHORISED, type ActionState } from "./action-state";
import { describeDbError, fieldForDbError, type DbErrorLike } from "./errors";
import { FieldReader, formValues } from "./validation";

export type ActionContext = AdminContext & {
  reader: FieldReader;
  values: Record<string, string>;
};

/**
 * The frame every admin server action runs in:
 *
 *   1. re-check the session and role on the server (never trust the page
 *      that rendered the form — actions are public HTTP endpoints),
 *   2. hand the action a validator over the submitted fields,
 *   3. turn an unexpected exception into a readable failure instead of the
 *      error page, while letting Next's own redirect/notFound through.
 *
 * `extend` turns a plain failure (not authorised, exception) into the
 * action's own state shape when it returns more than an ActionState.
 */
export async function adminActionWith<T extends ActionState>(
  formData: FormData,
  run: (context: ActionContext) => Promise<T>,
  extend: (state: ActionState) => T,
): Promise<T> {
  const values = formValues(formData);
  const admin = await requireAdmin();
  if (!admin) return extend(failed(NOT_AUTHORISED, {}, values));
  try {
    return await run({ ...admin, reader: FieldReader.fromFormData(formData), values });
  } catch (error) {
    unstable_rethrow(error);
    console.error("admin action threw:", error);
    return extend(
      failed("Something went wrong and nothing was saved. Try again.", {}, values),
    );
  }
}

export function adminAction(
  formData: FormData,
  run: (context: ActionContext) => Promise<ActionState>,
): Promise<ActionState> {
  return adminActionWith(formData, run, (state) => state);
}

/** A database refusal, with the message next to the field it concerns. */
export function dbFailed(
  error: DbErrorLike | null,
  values: Record<string, string>,
): ActionState {
  const message = describeDbError(error);
  const field = fieldForDbError(error);
  return failed(message, field ? { [field]: message } : {}, values);
}
