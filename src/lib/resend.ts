import { Resend } from "resend";

// Lazy singleton so Next's page-data collection phase doesn't crash
// when RESEND_API_KEY isn't available in the build sandbox. The client
// is created on first request; subsequent requests reuse it.
let _client: Resend | null = null;

export function getResend(): Resend {
  if (!_client) _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}
