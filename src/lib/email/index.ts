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

/*  Email Templates  */

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
              <span style="color:white;font-size:18px;"></span>
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
            <span style="font-size:24px;"></span>
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

/*  Waitlist Email Templates  */

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
                <span style="color:white;font-size:18px;"></span>
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
                  <span style="color:#2D6A4F;font-weight:700;margin-right:10px;"></span>
                  <span style="color:#374151;font-size:15px;">Line-item estimates with automatic margin calculation</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:12px;">
                  <span style="color:#2D6A4F;font-weight:700;margin-right:10px;"></span>
                  <span style="color:#374151;font-size:15px;">Customer-facing quote links with digital signature acceptance</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span style="color:#2D6A4F;font-weight:700;margin-right:10px;"></span>
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
                <span style="color:#2D6A4F;font-weight:700;margin-right:8px;"></span>
                <span style="color:#374151;font-size:14px;"><strong>KPI Cards</strong> — revenue, margin, jobs in progress at a glance</span>
              </td></tr>
              <tr><td style="padding-bottom:10px;">
                <span style="color:#2D6A4F;font-weight:700;margin-right:8px;"></span>
                <span style="color:#374151;font-size:14px;"><strong>Estimate Builder</strong> — line-item pricing with real-time margin tracking</span>
              </td></tr>
              <tr><td style="padding-bottom:10px;">
                <span style="color:#2D6A4F;font-weight:700;margin-right:8px;"></span>
                <span style="color:#374151;font-size:14px;"><strong>Job Kanban</strong> — track every job from estimate to completion</span>
              </td></tr>
              <tr><td>
                <span style="color:#2D6A4F;font-weight:700;margin-right:8px;"></span>
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
             <strong>We're keeping the first cohort small.</strong> If you referred anyone, now's the time.
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

/*  Onboarding Email  */

export function onboardingWelcomeEmail(opts: {
  orgName?: string;
  ownerEmail: string;
  dashboardUrl: string;
}) {
  const base = "https://fenceestimatepro.com";
  const greeting = opts.orgName ? opts.orgName : "there";
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
          <span style="color:white;font-size:20px;font-weight:800;letter-spacing:-0.3px;">FenceEstimatePro</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:36px 32px;">

          <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:800;line-height:1.3;">
            Welcome to FenceEstimatePro, ${greeting}.
          </h1>
          <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
            Your 14-day free trial is active. Here is everything you have access to right now.
          </p>

          <!-- Feature list -->
          <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">

            <tr><td style="padding-bottom:20px;vertical-align:top;border-bottom:1px solid #f3f4f6;">
              <p style="margin:0 0 4px;color:#111827;font-size:15px;font-weight:700;">Professional Estimates</p>
              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">Build accurate estimates for wood, vinyl, chain link, and aluminum fencing. The engine calculates material quantities and labor automatically based on linear footage and fence type. No spreadsheets.</p>
            </td></tr>

            <tr><td style="padding:20px 0;vertical-align:top;border-bottom:1px solid #f3f4f6;">
              <p style="margin:0 0 4px;color:#111827;font-size:15px;font-weight:700;">PDF Quotes with Digital Acceptance</p>
              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">Send estimates to customers by email. They can review, sign digitally, and accept online. You get notified the moment they accept. No printing. No chasing signatures.</p>
            </td></tr>

            <tr><td style="padding:20px 0;vertical-align:top;border-bottom:1px solid #f3f4f6;">
              <p style="margin:0 0 4px;color:#111827;font-size:15px;font-weight:700;">Job Management Board</p>
              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">Track every job from Scheduled to Active to Complete on a visual board. Drag to update status. Foreman can see their assigned jobs, verify materials, and complete checklists from the field.</p>
            </td></tr>

            <tr><td style="padding:20px 0;vertical-align:top;border-bottom:1px solid #f3f4f6;">
              <p style="margin:0 0 4px;color:#111827;font-size:15px;font-weight:700;">Material Verification</p>
              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">Before a job goes active, your foreman confirms all materials are on site. No more starting jobs short on posts or panels. Change orders get tracked against the original estimate automatically.</p>
            </td></tr>

            <tr><td style="padding:20px 0;vertical-align:top;border-bottom:1px solid #f3f4f6;">
              <p style="margin:0 0 4px;color:#111827;font-size:15px;font-weight:700;">Margin Tracking (Owner-Only)</p>
              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">See your gross margin on every estimate and job. Identify which fence types are most profitable. Your crew never sees cost data — only you do.</p>
            </td></tr>

            <tr><td style="padding:20px 0;vertical-align:top;border-bottom:1px solid #f3f4f6;">
              <p style="margin:0 0 4px;color:#111827;font-size:15px;font-weight:700;">Customer Database</p>
              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">Store every customer, their contact info, and job history in one place. Import existing customers via CSV. Never lose a lead or forget a follow-up again.</p>
            </td></tr>

            <tr><td style="padding:20px 0;vertical-align:top;">
              <p style="margin:0 0 4px;color:#111827;font-size:15px;font-weight:700;">Team Access</p>
              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">Invite your office staff and foremen. Sales reps can build and send estimates. Foremen can manage jobs from their phone. Everyone sees what they need — nothing more.</p>
            </td></tr>

          </table>

          <!-- Getting started -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
            <p style="margin:0 0 12px;color:#14532d;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Get your first estimate out in 10 minutes</p>
            <table cellpadding="0" cellspacing="0">
              <tr><td style="padding-bottom:8px;">
                <span style="display:inline-block;background:#2D6A4F;color:white;font-size:11px;font-weight:800;width:20px;height:20px;border-radius:50%;text-align:center;line-height:20px;margin-right:10px;">1</span>
                <a href="${base}/dashboard/customers/new" style="color:#15803d;font-size:14px;font-weight:600;text-decoration:none;">Add your first customer</a>
              </td></tr>
              <tr><td style="padding-bottom:8px;">
                <span style="display:inline-block;background:#2D6A4F;color:white;font-size:11px;font-weight:800;width:20px;height:20px;border-radius:50%;text-align:center;line-height:20px;margin-right:10px;">2</span>
                <a href="${base}/dashboard/estimates/new" style="color:#15803d;font-size:14px;font-weight:600;text-decoration:none;">Build your first estimate</a>
              </td></tr>
              <tr><td>
                <span style="display:inline-block;background:#2D6A4F;color:white;font-size:11px;font-weight:800;width:20px;height:20px;border-radius:50%;text-align:center;line-height:20px;margin-right:10px;">3</span>
                <a href="${base}/dashboard/settings" style="color:#15803d;font-size:14px;font-weight:600;text-decoration:none;">Set your material prices and target margin</a>
              </td></tr>
            </table>
          </div>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${opts.dashboardUrl}" style="display:inline-block;background:#2D6A4F;color:white;text-decoration:none;font-weight:700;font-size:15px;padding:14px 40px;border-radius:10px;">
                Open Your Dashboard
              </a>
            </td></tr>
          </table>

          <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;line-height:1.6;">
            Questions? Reply to this email — we respond same day.<br>
            Built by a veteran for contractors who run a real business.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            FenceEstimatePro &middot; fenceestimatepro.com &middot; Built in Florida
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/*  Deposit Reminder Email  */

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
             Next step: collect your deposit from ${opts.customerName}
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

export function trialDay7Email(opts: { email: string; orgName: string; trialEndsAt: string }) {
  const days = Math.max(0, Math.ceil((new Date(opts.trialEndsAt).getTime() - Date.now()) / 86400000));
  return {
    to: opts.email,
    subject: "How's FenceEstimatePro working for you?",
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <div style="background:#1a3a2a;padding:32px 40px;">
    <div style="color:#6fcf97;font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;">FenceEstimatePro</div>
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Week 1 check-in</h1>
  </div>
  <div style="padding:32px 40px;">
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">Hey ${opts.orgName},</p>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">You've been on FenceEstimatePro for a week. A few things worth knowing:</p>
    <ul style="color:#374151;line-height:1.8;padding-left:20px;margin:0 0 20px;">
      <li>Your trial has <strong>${days} days remaining</strong></li>
      <li>Contractors using FEP average <strong>35%+ gross margin</strong> on estimates</li>
      <li>The biggest win: knowing your number <em>before</em> you hand over the quote</li>
    </ul>
    <p style="color:#374151;line-height:1.6;margin:0 0 24px;">Questions? Just reply to this email — I read every one.</p>
    <a href="https://fenceestimatepro.com/dashboard" style="display:inline-block;background:#2D6A4F;color:#fff;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;">Open Dashboard →</a>
    <p style="color:#9ca3af;font-size:12px;margin:28px 0 0;">FenceEstimatePro · <a href="https://fenceestimatepro.com/unsubscribe" style="color:#9ca3af;">Unsubscribe</a></p>
  </div>
</div></body></html>`,
  };
}

export function trialDay12Email(opts: { email: string; orgName: string }) {
  return {
    to: opts.email,
    subject: "2 days left in your FenceEstimatePro trial",
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <div style="background:#1a3a2a;padding:32px 40px;">
    <div style="color:#f87171;font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;">Trial Ending Soon</div>
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Your trial ends in 2 days</h1>
  </div>
  <div style="padding:32px 40px;">
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">Hey ${opts.orgName},</p>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">Your free trial wraps up in 2 days. After that, you'll need an active plan to keep building estimates and tracking jobs.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 24px;">
      <p style="color:#166534;font-weight:700;margin:0 0 8px;font-size:15px;">Most popular: Pro — $89/month</p>
      <ul style="color:#166534;line-height:1.8;padding-left:18px;margin:0;font-size:14px;">
        <li>5 users (owner + foreman + sales)</li>
        <li>Unlimited estimates</li>
        <li>Job tracking + foreman app</li>
        <li>Customer portal + digital signatures</li>
      </ul>
    </div>
    <a href="https://fenceestimatepro.com/dashboard/upgrade" style="display:inline-block;background:#2D6A4F;color:#fff;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;">Upgrade Now →</a>
    <p style="color:#9ca3af;font-size:12px;margin:28px 0 0;">FenceEstimatePro · <a href="https://fenceestimatepro.com/unsubscribe" style="color:#9ca3af;">Unsubscribe</a></p>
  </div>
</div></body></html>`,
  };
}

export function trialExpiredEmail(opts: { email: string; orgName: string }) {
  return {
    to: opts.email,
    subject: "Your FenceEstimatePro trial has ended",
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <div style="background:#1a3a2a;padding:32px 40px;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Your trial has ended</h1>
  </div>
  <div style="padding:32px 40px;">
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">Hey ${opts.orgName},</p>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">Your 14-day trial is up. Your data is safe — we hold it for 30 days. Pick a plan to get back to work.</p>
    <a href="https://fenceestimatepro.com/dashboard/upgrade" style="display:inline-block;background:#2D6A4F;color:#fff;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:16px;">Choose a Plan →</a>
    <p style="color:#6b7280;font-size:13px;margin:0;">Starting at $49/month. Cancel anytime.</p>
    <p style="color:#9ca3af;font-size:12px;margin:28px 0 0;">FenceEstimatePro · <a href="https://fenceestimatepro.com/unsubscribe" style="color:#9ca3af;">Unsubscribe</a></p>
  </div>
</div></body></html>`,
  };
}
