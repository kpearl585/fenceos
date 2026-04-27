import { test, expect } from "@playwright/test";

import { acceptEstimateThroughPage, postAcceptanceRequest } from "./utils/acceptance";
import {
  cleanupSeededEstimate,
  getOwnerTestContext,
  hasE2EAdminEnv,
  seedQuotedEstimate,
} from "./utils/admin";

test.describe("Public Acceptance Negative Paths", () => {
  test.skip(
    !hasE2EAdminEnv,
    "Requires owner test credentials and Supabase service-role env"
  );

  test("invalid token is rejected and accepted estimates cannot be replayed", async ({
    context,
    request,
  }) => {
    const owner = await getOwnerTestContext();
    const seed = await seedQuotedEstimate(owner);
    const customerName = "Replay Test Customer";
    const customerEmail = "replay-test@example.com";

    try {
      const invalidResponse = await postAcceptanceRequest(request, {
        estimateId: seed.estimateId,
        token: "00000000-0000-0000-0000-000000000000",
        name: customerName,
        email: customerEmail,
      });

      expect(invalidResponse.status()).toBe(404);
      const invalidJson = await invalidResponse.json();
      expect(invalidJson).toMatchObject({
        error: "Invalid or expired acceptance link",
      });

      await acceptEstimateThroughPage(
        context,
        seed.estimateId,
        seed.acceptToken,
        customerName,
        customerEmail
      );

      const replayResponse = await postAcceptanceRequest(request, {
        estimateId: seed.estimateId,
        token: seed.acceptToken,
        name: customerName,
        email: customerEmail,
      });

      expect(replayResponse.status()).toBe(400);
      const replayJson = await replayResponse.json();
      expect(String(replayJson.error ?? "")).toContain("cannot accept");

      const acceptedPage = await context.newPage();
      try {
        await acceptedPage.goto(`/accept/${seed.estimateId}/${seed.acceptToken}`);
        await expect(
          acceptedPage.getByRole("heading", { name: "Estimate Accepted" })
        ).toBeVisible({ timeout: 15000 });
      } finally {
        await acceptedPage.close();
      }
    } finally {
      await cleanupSeededEstimate(seed);
    }
  });
});
