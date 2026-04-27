function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getAppOrigin(): string {
  const configured =
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    (process.env.VERCEL_URL
      ? normalizeOrigin(`https://${process.env.VERCEL_URL}`)
      : null);

  return configured ?? "http://localhost:3000";
}
