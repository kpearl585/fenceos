// ── Photo Estimator — claim email ───────────────────────────────
// Sends the "your estimate is ready, claim it" email after a user drops
// their address on the result card. The claim URL embeds claim_token
// so signup (a follow-up sprint) can transfer the estimate into a real
// fence_graphs row owned by the new account.

import { getResend } from "@/lib/resend";

const FROM_ADDRESS =
  process.env.PHOTO_ESTIMATE_EMAIL_FROM ?? "FenceEstimatePro <hello@fenceestimatepro.com>";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://fenceestimatepro.com";

export interface SendClaimEmailInput {
  to: string;
  claimToken: string;
  priceRangeLow: number;
  priceRangeHigh: number;
  fenceTypeLabel: string;
  totalLinearFeet: number;
}

export async function sendClaimEmail(input: SendClaimEmailInput): Promise<void> {
  const claimUrl = `${APP_URL}/claim?token=${encodeURIComponent(input.claimToken)}&email=${encodeURIComponent(input.to)}`;
  const priceRange = `$${input.priceRangeLow.toLocaleString()} – $${input.priceRangeHigh.toLocaleString()}`;

  const subject = `Your ${input.fenceTypeLabel} estimate — claim it in one click`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#0b2545;color:#ffffff;padding:24px 28px;">
                <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#93c5fd;">FenceEstimatePro</p>
                <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">Your fence estimate is ready</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#111827;">
                <p style="margin:0 0 12px;font-size:16px;">We ran the photo you uploaded through our AI estimator. Here&rsquo;s the rough cut:</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:18px;margin:16px 0;">
                  <tr>
                    <td>
                      <p style="margin:0;font-size:12px;color:#4338ca;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Estimated price range</p>
                      <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#111827;">${priceRange}</p>
                      <p style="margin:8px 0 0;font-size:14px;color:#4b5563;">${input.fenceTypeLabel} &middot; ${input.totalLinearFeet} linear feet</p>
                    </td>
                  </tr>
                </table>

                <p style="margin:16px 0 20px;font-size:15px;color:#374151;">Save this estimate to your free account to see the full material breakdown and send a contractor-ready proposal.</p>

                <p style="margin:20px 0;text-align:center;">
                  <a href="${claimUrl}" style="display:inline-block;padding:12px 22px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;font-size:15px;">Claim your estimate &rarr;</a>
                </p>

                <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">Or copy this link: <span style="color:#2563eb;word-break:break-all;">${claimUrl}</span></p>

                <p style="margin:20px 0 0;padding:12px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;font-size:12px;color:#78350f;"><strong>This is an AI estimate from a photo, not a contract price.</strong> Always walk the site and measure before bidding a real job. Measurements are model-generated and may be wrong.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
                <p style="margin:0;">You received this email because you requested an estimate at fenceestimatepro.com.</p>
                <p style="margin:6px 0 0;">If you didn&rsquo;t, you can safely ignore it &mdash; your estimate will expire in 30 days.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Your fence estimate is ready`,
    ``,
    `${input.fenceTypeLabel} — ${input.totalLinearFeet} linear feet`,
    `Estimated price range: ${priceRange}`,
    ``,
    `Claim your estimate: ${claimUrl}`,
    ``,
    `If you didn't request this, you can safely ignore it. Your estimate expires in 30 days.`,
  ].join("\n");

  const result = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject,
    html,
    text,
  });

  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }
}
