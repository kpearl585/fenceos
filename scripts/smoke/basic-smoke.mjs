import assert from "node:assert/strict";

const baseUrl = process.env.SMOKE_BASE_URL;

if (!baseUrl) {
  console.log("[smoke] SMOKE_BASE_URL not set. Skipping smoke test scaffold.");
  process.exit(0);
}

const origin = baseUrl.replace(/\/$/, "");

async function request(path, init) {
  const response = await fetch(`${origin}${path}`, {
    redirect: "manual",
    ...init,
  });

  return response;
}

async function main() {
  const loginResponse = await request("/login");
  assert.equal(loginResponse.status, 200, "GET /login should return 200");
  const loginHtml = await loginResponse.text();
  assert.match(loginHtml, /FenceEstimatePro/i, "Login page should render brand copy");

  const unsubscribeResponse = await request("/unsubscribe");
  assert.equal(unsubscribeResponse.status, 200, "GET /unsubscribe should return 200");
  const unsubscribeHtml = await unsubscribeResponse.text();
  assert.match(unsubscribeHtml, /Email Preferences/i, "Unsubscribe page should render preference copy");

  const dashboardResponse = await request("/dashboard");
  assert.ok(
    [302, 303, 307, 308].includes(dashboardResponse.status),
    "GET /dashboard should redirect when unauthenticated"
  );
  assert.equal(
    dashboardResponse.headers.get("location"),
    "/login",
    "Unauthenticated dashboard access should redirect to /login"
  );

  const waitlistCountResponse = await request("/api/waitlist-count");
  assert.equal(waitlistCountResponse.status, 200, "GET /api/waitlist-count should return 200");
  const waitlistCountJson = await waitlistCountResponse.json();
  assert.equal(typeof waitlistCountJson.count, "number", "Waitlist count response should include a numeric count");

  const invalidLeadResponse = await request("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", name: "Smoke Test" }),
  });
  assert.equal(invalidLeadResponse.status, 400, "POST /api/leads should reject invalid emails");

  const ownerResponse = await request("/api/owner");
  assert.equal(ownerResponse.status, 401, "GET /api/owner should require authentication");

  console.log(`[smoke] Passed against ${origin}`);
}

main().catch((error) => {
  console.error("[smoke] Failed:", error);
  process.exit(1);
});
