type SupabaseLikeError = {
  code?: string;
  message?: string;
};

export function isMissingInvitationNameColumnsError(error: unknown): boolean {
  const e = (error ?? {}) as SupabaseLikeError;
  const message = (e.message || "").toLowerCase();

  if (!message) return false;

  const referencesNameColumns =
    message.includes("first_name") || message.includes("last_name");

  const columnMissingSignature =
    e.code === "42703" ||
    e.code === "PGRST204" ||
    message.includes("does not exist") ||
    (message.includes("column") && message.includes("schema cache"));

  return referencesNameColumns && columnMissingSignature;
}
