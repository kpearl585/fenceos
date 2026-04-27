import assert from "node:assert/strict";

const baseUrl = process.env.SMOKE_BASE_URL;
const cookieHeader = process.env.SMOKE_SESSION_COOKIE;

if (!baseUrl) {
  console.log("[smoke:auth] SMOKE_BASE_URL not set. Skipping authenticated smoke scaffold.");
  process.exit(0);
}

if (!cookieHeader) {
  console.log("[smoke:auth] SMOKE_SESSION_COOKIE not set. Skipping authenticated smoke scaffold.");
  process.exit(0);
}

const origin = baseUrl.replace(/\/$/, "");

async function request(path, init = {}) {
  return fetch(`${origin}${path}`, {
    redirect: "manual",
    headers: {
      cookie: cookieHeader,
      ...(init.headers ?? {}),
    },
    ...init,
  });
}

async function main() {
  const dashboardResponse = await request("/dashboard");
  assert.equal(dashboardResponse.status, 200, "Authenticated dashboard should return 200");
  const dashboardHtml = await dashboardResponse.text();
  assert.match(dashboardHtml, /dashboard/i, "Dashboard should render dashboard content");

  const referralResponse = await request("/api/referral");
  assert.equal(referralResponse.status, 200, "Authenticated referral endpoint should return 200");
  const referralJson = await referralResponse.json();
  assert.equal(typeof referralJson.referralLink, "string", "Referral payload should include a referralLink");

  const settingsResponse = await request("/dashboard/settings");
  assert.ok(
    [200, 307, 308].includes(settingsResponse.status),
    "Authenticated settings access should either load or redirect based on role"
  );

  console.log(`[smoke:auth] Passed against ${origin}`);
}

main().catch((error) => {
  console.error("[smoke:auth] Failed:", error);
  process.exit(1);
});
