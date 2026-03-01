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

/* ── Waitlist Email Templates ── */

export function waitlistWelcomeEmail(opts: { email: string }) {
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
          <div>
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="background:#2D6A4F;width:36px;height:36px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;">
                <span style="color:white;font-size:18px;">🏠</span>
              </div>
              <span style="color:white;font-size:18px;font-weight:800;margin-left:10px;">FenceEstimatePro</span>
            </div>
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:36px 32px;">
          <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:800;">You made the right call.</h1>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
            Most fence contractors are still pricing jobs from gut feel — and losing 15-20% margin on every single one.
            FenceEstimatePro changes that. We're building the estimating platform that shows you your exact profit
            before the quote ever goes out.
          </p>

          <!-- What's coming -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:24px;margin-bottom:24px;">
            <p style="margin:0 0 16px;color:#14532d;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">What's coming</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding-bottom:12px;">
                  <span style="color:#2D6A4F;font-weight:700;margin-right:10px;">✓</span>
                  <span style="color:#374151;font-size:15px;">Line-item estimates with automatic margin calculation</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:12px;">
                  <span style="color:#2D6A4F;font-weight:700;margin-right:10px;">✓</span>
                  <span style="color:#374151;font-size:15px;">Customer-facing quote links with digital signature acceptance</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span style="color:#2D6A4F;font-weight:700;margin-right:10px;">✓</span>
                  <span style="color:#374151;font-size:15px;">Job tracking from estimate to completion — for your whole crew</span>
                </td>
              </tr>
            </table>
          </div>

          <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.7;">
            We're opening access to early members first. <strong>You'll hear from us before anyone else.</strong>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#6b7280;font-size:13px;text-align:center;">
            Questions? Reply to this email. A real person reads every response.
          </p>
          <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;text-align:center;">
            FenceEstimatePro · fenceestimatepro.com
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function waitlistDayThreeEmail(opts: { email: string }) {
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
          <span style="color:white;font-size:18px;font-weight:800;">FenceEstimatePro</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:36px 32px;">
          <h1 style="margin:0 0 20px;color:#111827;font-size:22px;font-weight:800;line-height:1.3;">The $4,200 mistake most fence contractors make every month</h1>

          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;font-style:italic;">
            Here's a scenario we hear all the time from contractors...
          </p>

          <!-- Story box -->
          <div style="background:#f9fafb;border-left:4px solid #2D6A4F;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:24px;">
            <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">
              A contractor bids a job at <strong>$8,500</strong>. Materials come in at $3,200. Labor runs $2,800.
              He thinks he made <strong>$2,500</strong>.
            </p>
            <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">
              But he forgot:
            </p>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
              <tr><td style="padding-bottom:6px;color:#6b7280;font-size:14px;">→ Fuel: <strong style="color:#374151;">$180</strong></td></tr>
              <tr><td style="padding-bottom:6px;color:#6b7280;font-size:14px;">→ Dump fees: <strong style="color:#374151;">$120</strong></td></tr>
              <tr><td style="padding-bottom:6px;color:#6b7280;font-size:14px;">→ Equipment wear: <strong style="color:#374151;">$200</strong></td></tr>
              <tr><td style="color:#6b7280;font-size:14px;">→ 2 hours unbillable time fixing a supplier mistake: <strong style="color:#374151;">$240</strong></td></tr>
            </table>
            <p style="margin:0;color:#111827;font-size:15px;font-weight:700;">
              He actually made $1,760. On an $8,500 job.
            </p>
            <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">
              That's a <strong style="color:#dc2626;">20% margin</strong> he thought was 29%.
            </p>
          </div>

          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">
            <strong>This isn't a rare mistake. It's the default for contractors without a system.</strong>
          </p>
          <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.7;">
            FenceEstimatePro builds the system for you. Every cost accounted for. Every job profitable on purpose.
          </p>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="https://fenceestimatepro.com/#how-it-works"
                style="display:inline-block;background:#2D6A4F;color:white;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;">
                See How It Works →
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            FenceEstimatePro · fenceestimatepro.com
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function waitlistDaySevenEmail(opts: { email: string }) {
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
          <span style="color:white;font-size:18px;font-weight:800;">FenceEstimatePro</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:36px 32px;">
          <p style="margin:0 0 6px;color:#2D6A4F;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Early Access Update</p>
          <h1 style="margin:0 0 20px;color:#111827;font-size:24px;font-weight:800;">Early access is almost here — sneak peek inside</h1>

          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">We're getting close.</p>

          <!-- Dashboard preview -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:24px;margin-bottom:24px;">
            <p style="margin:0 0 14px;color:#14532d;font-size:14px;font-weight:700;">Here's what you'll see when you log in for the first time:</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding-bottom:10px;">
                <span style="color:#2D6A4F;font-weight:700;margin-right:8px;">📊</span>
                <span style="color:#374151;font-size:14px;"><strong>KPI Cards</strong> — revenue, margin, jobs in progress at a glance</span>
              </td></tr>
              <tr><td style="padding-bottom:10px;">
                <span style="color:#2D6A4F;font-weight:700;margin-right:8px;">🧮</span>
                <span style="color:#374151;font-size:14px;"><strong>Estimate Builder</strong> — line-item pricing with real-time margin tracking</span>
              </td></tr>
              <tr><td style="padding-bottom:10px;">
                <span style="color:#2D6A4F;font-weight:700;margin-right:8px;">📋</span>
                <span style="color:#374151;font-size:14px;"><strong>Job Kanban</strong> — track every job from estimate to completion</span>
              </td></tr>
              <tr><td>
                <span style="color:#2D6A4F;font-weight:700;margin-right:8px;">💰</span>
                <span style="color:#374151;font-size:14px;"><strong>P&amp;L View</strong> — actual vs. estimated profit on every job</span>
              </td></tr>
            </table>
          </div>

          <!-- Early access perks -->
          <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:700;">Early access members get:</p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="padding-bottom:8px;color:#374151;font-size:14px;">→ Priority onboarding support — we'll walk you through it personally</td></tr>
            <tr><td style="padding-bottom:8px;color:#374151;font-size:14px;">→ Locked-in early pricing — never goes up as long as you stay</td></tr>
            <tr><td style="color:#374151;font-size:14px;">→ Direct line to the product team — your feedback shapes the roadmap</td></tr>
          </table>

          <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.7;background:#fef9c3;border-radius:8px;padding:14px 18px;">
            ⚡ <strong>We're keeping the first cohort small.</strong> If you referred anyone, now's the time.
          </p>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="https://fenceestimatepro.com"
                style="display:inline-block;background:#2D6A4F;color:white;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;">
                You're confirmed for early access →
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            FenceEstimatePro · fenceestimatepro.com
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── Onboarding Email ── */

export function onboardingWelcomeEmail(opts: {
  orgName: string;
  ownerEmail: string;
  dashboardUrl: string;
}) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://fenceestimatepro.com";
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
          <div style="display:inline-flex;align-items:center;">
            <div style="background:#2D6A4F;width:36px;height:36px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;">
              <span style="color:white;font-size:18px;">🏠</span>
            </div>
            <span style="color:white;font-size:18px;font-weight:800;margin-left:12px;">FenceEstimatePro</span>
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:36px 32px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;">
            <span style="font-size:22px;margin-right:12px;">🎉</span>
            <p style="margin:0;color:#15803d;font-weight:700;font-size:15px;">Your account is live, ${opts.orgName}.</p>
          </div>

          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
            Here's how to get your first professional estimate out the door in the next 10 minutes:
          </p>

          <!-- Steps -->
          <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
            <tr>
              <td style="padding-bottom:16px;vertical-align:top;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:32px;height:32px;background:#2D6A4F;border-radius:50%;text-align:center;vertical-align:middle;">
                    <span style="color:white;font-size:13px;font-weight:800;">1</span>
                  </td>
                  <td style="padding-left:14px;">
                    <p style="margin:0;color:#111827;font-size:15px;font-weight:700;">Add your first customer</p>
                    <a href="${base}/dashboard/customers/new" style="color:#2D6A4F;font-size:13px;">${base}/dashboard/customers/new</a>
                  </td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:16px;vertical-align:top;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:32px;height:32px;background:#2D6A4F;border-radius:50%;text-align:center;vertical-align:middle;">
                    <span style="color:white;font-size:13px;font-weight:800;">2</span>
                  </td>
                  <td style="padding-left:14px;">
                    <p style="margin:0;color:#111827;font-size:15px;font-weight:700;">Build your first estimate</p>
                    <a href="${base}/dashboard/estimates/new" style="color:#2D6A4F;font-size:13px;">${base}/dashboard/estimates/new</a>
                  </td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="vertical-align:top;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:32px;height:32px;background:#2D6A4F;border-radius:50%;text-align:center;vertical-align:middle;">
                    <span style="color:white;font-size:13px;font-weight:800;">3</span>
                  </td>
                  <td style="padding-left:14px;">
                    <p style="margin:0;color:#111827;font-size:15px;font-weight:700;">Set your target margin in Settings</p>
                    <a href="${base}/dashboard/settings" style="color:#2D6A4F;font-size:13px;">${base}/dashboard/settings</a>
                  </td>
                </tr></table>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.7;">
            Most contractors send their first professional estimate within 10 minutes of signing up.
          </p>
          <p style="margin:0 0 28px;color:#6b7280;font-size:14px;">
            Need help? Reply to this email. We'll walk you through it.
          </p>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${opts.dashboardUrl}"
                style="display:inline-block;background:#2D6A4F;color:white;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;">
                Go to Your Dashboard →
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            FenceEstimatePro · fenceestimatepro.com
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── Deposit Reminder Email ── */

export function depositReminderEmail(opts: {
  ownerEmail: string;
  customerName: string;
  depositAmount: number;
  estimateUrl: string;
  orgName: string;
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
          <span style="color:white;font-size:18px;font-weight:800;">FenceEstimatePro</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:36px 32px;">
          <h1 style="margin:0 0 20px;color:#111827;font-size:22px;font-weight:800;">
            💰 Next step: collect your deposit from ${opts.customerName}
          </h1>

          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">
            Great news — <strong>${opts.customerName}</strong> accepted your estimate.
          </p>

          <!-- Deposit amount -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
            <p style="margin:0 0 4px;color:#15803d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Deposit to Collect</p>
            <p style="margin:0;color:#14532d;font-size:36px;font-weight:800;">${fmt(opts.depositAmount)}</p>
          </div>

          <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:700;">
            Don't start work without it. Here's how to follow up:
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="padding-bottom:10px;color:#374151;font-size:14px;line-height:1.6;">
              • Call or text them within 24 hours while the excitement is fresh
            </td></tr>
            <tr><td style="padding-bottom:10px;color:#374151;font-size:14px;line-height:1.6;">
              • Accept payment via check, Zelle, Venmo, or card
            </td></tr>
            <tr><td style="color:#374151;font-size:14px;line-height:1.6;">
              • Document receipt before scheduling the job
            </td></tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${opts.estimateUrl}"
                style="display:inline-block;background:#2D6A4F;color:white;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;">
                View Accepted Estimate →
              </a>
            </td></tr>
          </table>

          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:20px;">
            Stripe payment integration coming soon — you'll be able to collect deposits directly through FenceEstimatePro.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            FenceEstimatePro · fenceestimatepro.com
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
