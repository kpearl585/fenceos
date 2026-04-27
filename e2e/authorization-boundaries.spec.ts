import { test, expect } from "@playwright/test";

import { login } from "./utils/auth";
import {
  cleanupSeededJob,
  createTempOrgUser,
  deleteTempOrgUser,
  getOwnerTestContext,
  hasE2EAdminEnv,
  seedActiveJob,
  type TempOrgUser,
} from "./utils/admin";

test.describe("Authorization Boundaries", () => {
  test.skip(
    !hasE2EAdminEnv,
    "Requires owner test credentials and Supabase service-role env"
  );

  test("invoice endpoint rejects unauthenticated and foreman callers, and foreman UI hides paid action", async ({
    browser,
    request,
  }) => {
    const owner = await getOwnerTestContext();
    const seed = await seedActiveJob(owner);
    let foreman: TempOrgUser | null = null;

    try {
      const unauthenticated = await request.post(`/api/jobs/${seed.jobId}/invoice`);
      expect(unauthenticated.status()).toBe(401);

      foreman = await createTempOrgUser(owner, "foreman");
      const foremanContext = await browser.newContext();
      const foremanPage = await foremanContext.newPage();

      try {
        await login(foremanPage, foreman.email, foreman.password);
        await foremanPage.goto(`/dashboard/jobs/${seed.jobId}`);
        const notFoundHeading = foremanPage.getByText("Page not found");
        if (await notFoundHeading.count()) {
          await expect(notFoundHeading).toBeVisible({ timeout: 15000 });
        } else {
          await expect(
            foremanPage.getByRole("button", { name: "Mark as Paid" })
          ).toHaveCount(0);
        }

        const foremanInvoiceAttempt = await foremanContext.request.post(
          `/api/jobs/${seed.jobId}/invoice`
        );
        expect(foremanInvoiceAttempt.status()).toBe(403);
      } finally {
        await foremanContext.close();
      }
    } finally {
      if (foreman) {
        await deleteTempOrgUser(foreman);
      }
      await cleanupSeededJob(seed);
    }
  });
});
