/**
 * Email sending via Resend.
 * Falls back silently if RESEND_API_KEY is not configured.
 */

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — email not sent to", opts.to);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "FenceEstimatePro <noreply@fenceestimatepro.com>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Resend error:", err);
  }
}

/* ── Email Templates ── */

export function estimateShareEmail(opts: {
  orgName: string;
  customerName: string;
  total: number;
  acceptUrl: string;
  expiryDays?: number;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#0a1a12;border-radius:12px 12px 0 0;padding:28px 32px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="background:#2D6A4F;width:36px;height:36px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;">
              <span style="color:white;font-size:18px;">🏠</span>
            </div>
            <span style="color:white;font-size:16px;font-weight:700;margin-left:10px;">${opts.orgName}</span>
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:32px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Hello ${opts.customerName},</p>
          <h1 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;">Your estimate is ready</h1>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            ${opts.orgName} has prepared a fence estimate for your review.
            Please click the button below to view the full details and accept the estimate.
          </p>

          <!-- Total -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
            <p style="margin:0 0 4px;color:#15803d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Estimate Total</p>
            <p style="margin:0;color:#14532d;font-size:32px;font-weight:800;">${fmt(opts.total)}</p>
          </div>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="${opts.acceptUrl}"
                style="display:inline-block;background:#2D6A4F;color:white;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;">
                View &amp; Accept Estimate →
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;text-align:center;">
            Or copy this link: <a href="${opts.acceptUrl}" style="color:#2D6A4F;">${opts.acceptUrl}</a>
          </p>
          ${opts.expiryDays ? `<p style="margin:8px 0 0;color:#9ca3af;font-size:12px;text-align:center;">This link expires in ${opts.expiryDays} days.</p>` : ""}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            Powered by <strong>FenceEstimatePro</strong> · fenceestimatepro.com
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function estimateAcceptedOwnerEmail(opts: {
  ownerEmail: string;
  orgName: string;
  customerName: string;
  total: number;
  estimateUrl: string;
  acceptedAt: string;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const date = new Date(opts.acceptedAt).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="background:#0a1a12;border-radius:12px 12px 0 0;padding:28px 32px;">
          <span style="color:white;font-size:16px;font-weight:700;">FenceEstimatePro</span>
        </td></tr>
        <tr><td style="background:white;padding:32px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:24px;display:flex;align-items:center;gap:12px;">
            <span style="font-size:24px;">🎉</span>
            <div>
              <p style="margin:0;color:#15803d;font-weight:700;font-size:15px;">Estimate Accepted!</p>
              <p style="margin:4px 0 0;color:#16a34a;font-size:13px;">${date}</p>
            </div>
          </div>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
            <strong>${opts.customerName}</strong> has accepted your estimate for ${fmt(opts.total)}.
            The signed contract has been stored automatically.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="${opts.estimateUrl}"
                style="display:inline-block;background:#2D6A4F;color:white;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;">
                View Estimate &amp; Convert to Job →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">FenceEstimatePro · fenceestimatepro.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function estimateAcceptedCustomerEmail(opts: {
  orgName: string;
  customerName: string;
  total: number;
  contractUrl?: string;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="background:#0a1a12;border-radius:12px 12px 0 0;padding:28px 32px;">
          <span style="color:white;font-size:16px;font-weight:700;">${opts.orgName}</span>
        </td></tr>
        <tr><td style="background:white;padding:32px;">
          <h1 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:700;">You're all set, ${opts.customerName}!</h1>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            Your estimate of <strong>${fmt(opts.total)}</strong> has been accepted and your signed contract has been recorded.
            ${opts.orgName} will be in touch shortly to schedule your project.
          </p>
          ${opts.contractUrl ? `
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="${opts.contractUrl}"
                style="display:inline-block;background:#2D6A4F;color:white;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;">
                Download Signed Contract →
              </a>
            </td></tr>
          </table>` : ""}
          <p style="margin:0;color:#6b7280;font-size:13px;">Keep this email for your records. Questions? Contact ${opts.orgName} directly.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Powered by FenceEstimatePro · fenceestimatepro.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
