import { test, expect } from "@playwright/test";

import { loginWithTestUser } from "./utils/auth";
import { acceptEstimateThroughPage } from "./utils/acceptance";
import { ensureFreshEstimatorMaterials, getAdminClient, getOwnerTestContext, hasE2EAdminEnv } from "./utils/admin";

const admin = hasE2EAdminEnv ? getAdminClient() : null;

type FlowState = {
  estimateId: string | null;
  customerId: string | null;
  jobId: string | null;
  orgId: string | null;
  invoiceNumber: string | null;
};

async function loadEstimate(estimateId: string) {
  const { data, error } = await admin!
    .from("estimates")
    .select("id, org_id, customer_id, status, accept_token, accepted_at, deposit_paid")
    .eq("id", estimateId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load estimate ${estimateId}: ${error?.message ?? "not found"}`);
  }

  return data;
}

async function loadJobByEstimateId(estimateId: string) {
  const { data, error } = await admin!
    .from("jobs")
    .select("id, org_id, status, paid_at, invoice_url")
    .eq("estimate_id", estimateId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load job for estimate ${estimateId}: ${error.message}`);
  }

  return data;
}

async function loadInvoice(jobId: string) {
  const { data, error } = await admin!
    .from("invoices")
    .select("invoice_number, pdf_url")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load invoice for job ${jobId}: ${error.message}`);
  }

  return data;
}

async function markDepositPaid(estimateId: string) {
  const timestamp = new Date().toISOString();
  const { error } = await admin!
    .from("estimates")
    .update({
      status: "deposit_paid",
      deposit_paid: true,
      deposit_paid_at: timestamp,
      stripe_payment_status: "paid",
      updated_at: timestamp,
    })
    .eq("id", estimateId);

  if (error) {
    throw new Error(`Failed to simulate deposit payment: ${error.message}`);
  }
}

async function approveMaterialsAndSchedule(jobId: string) {
  const { error } = await admin!
    .from("jobs")
    .update({
      material_verification_status: "foreman_approved",
      scheduled_date: new Date().toISOString().slice(0, 10),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to approve materials for job ${jobId}: ${error.message}`);
  }
}

async function cleanupFlow(state: FlowState) {
  if (!admin || !state.estimateId) return;

  if (state.jobId) {
    const changeOrderIds =
      (
        (
          await admin
            .from("change_orders")
            .select("id")
            .eq("job_id", state.jobId)
        ).data ?? []
      ).map((row) => row.id);

    await admin.from("invoices").delete().eq("job_id", state.jobId);
    await admin.from("job_line_items").delete().eq("job_id", state.jobId);
    await admin.from("job_material_verifications").delete().eq("job_id", state.jobId);
    await admin.from("job_checklists").delete().eq("job_id", state.jobId);
    await admin.from("job_photos").delete().eq("job_id", state.jobId);
    if (changeOrderIds.length > 0) {
      await admin
        .from("change_order_line_items")
        .delete()
        .in("change_order_id", changeOrderIds);
    }
    await admin.from("change_orders").delete().eq("job_id", state.jobId);
    await admin.from("jobs").delete().eq("id", state.jobId);
  }

  await admin.from("estimate_line_items").delete().eq("estimate_id", state.estimateId);
  await admin.from("estimates").delete().eq("id", state.estimateId);

  if (state.customerId) {
    await admin.from("customers").delete().eq("id", state.customerId);
  }

  if (state.orgId) {
    const contractPaths = [
      `${state.orgId}/${state.estimateId}/signature.png`,
      `${state.orgId}/${state.estimateId}/signed-contract.pdf`,
      `${state.orgId}/${state.estimateId}/estimate.pdf`,
    ];

    if (state.jobId && state.invoiceNumber) {
      contractPaths.push(`invoices/${state.orgId}/${state.jobId}/${state.invoiceNumber}.pdf`);
    }

    await admin.storage.from("contracts").remove(contractPaths);
  }
}

function extractUuidFromUrl(url: string, resource: "estimates" | "jobs") {
  const match = url.match(new RegExp(`/dashboard/${resource}/([0-9a-f-]{36})`, "i"));
  return match?.[1] ?? null;
}

test.describe("Owner Money Path", () => {
  test.skip(
    !hasE2EAdminEnv,
    "Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_USER_EMAIL, and TEST_USER_PASSWORD"
  );

  test("owner can create, quote, accept, deposit, convert, start, and invoice a job", async ({
    page,
    context,
  }) => {
    const tag = Date.now().toString(36);
    const customerName = `E2E Money Path ${tag}`;
    const customerEmail = `e2e-money-${tag}@example.com`;
    const projectName = `E2E Money Path ${tag}`;
    const state: FlowState = {
      estimateId: null,
      customerId: null,
      jobId: null,
      orgId: null,
      invoiceNumber: null,
    };

    try {
      await ensureFreshEstimatorMaterials(await getOwnerTestContext());
      await loginWithTestUser(page);

      await test.step("Create estimate from advanced estimator UI", async () => {
        await page.goto("/dashboard/advanced-estimate");
        const manualInputButton = page.getByRole("button", { name: "Manual Input" });
        if (await manualInputButton.isVisible()) {
          await manualInputButton.click();
        }
        await expect(page.getByText("Project Setup")).toBeVisible();

        await page.locator("#est-project-name").fill(projectName);
        await page.locator("#est-runs input[type='number']").first().fill("120");
        await page.getByPlaceholder("Jane Smith").fill(customerName);
        await page.getByPlaceholder("123 Main St").fill("123 Test Fence Lane");
        await page.getByPlaceholder("Orlando, FL 32801").fill("Orlando, FL 32801");
        await page.getByPlaceholder("(555) 000-0000").fill("555-0110");

        await expect(page.getByText("Estimate Summary")).toBeVisible({ timeout: 15000 });
        await page.getByRole("button", { name: /Create Estimate/ }).click();

        await page.waitForURL(/\/dashboard\/estimates\/[0-9a-f-]{36}/, {
          timeout: 20000,
        });
        state.estimateId = extractUuidFromUrl(page.url(), "estimates");
        expect(state.estimateId).toBeTruthy();
      });

      await test.step("Send quote from estimate detail page", async () => {
        await expect(page.getByRole("button", { name: "Send Quote" })).toBeVisible();
        await page.getByRole("button", { name: "Send Quote" }).click();
        await expect(page.getByText("Share with Customer")).toBeVisible({
          timeout: 15000,
        });

        await expect
          .poll(async () => (await loadEstimate(state.estimateId!)).status, {
            message: "estimate should move to quoted",
          })
          .toBe("quoted");

        const loadedEstimate = await loadEstimate(state.estimateId!);
        state.customerId = loadedEstimate.customer_id;
        state.orgId = loadedEstimate.org_id;
        expect(loadedEstimate.accept_token).toBeTruthy();
      });

      await test.step("Customer accepts the quote through the public acceptance page", async () => {
        const estimate = await loadEstimate(state.estimateId!);
        await acceptEstimateThroughPage(
          context,
          state.estimateId!,
          estimate.accept_token!,
          customerName,
          customerEmail
        );

        await expect
          .poll(async () => (await loadEstimate(state.estimateId!)).status, {
            message: "estimate should be accepted after signature",
          })
          .toBe("accepted");
      });

      await test.step("Deposit gate blocks conversion until payment is recorded", async () => {
        await page.reload();
        await expect(
          page.getByText("Deposit Required Before Scheduling")
        ).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole("button", { name: "Collect Deposit" })).toBeVisible();

        await markDepositPaid(state.estimateId!);
        await page.reload();
        await expect(page.getByRole("button", { name: "Convert to Job" })).toBeVisible({
          timeout: 15000,
        });
      });

      await test.step("Convert estimate to job and start work", async () => {
        await page.getByRole("button", { name: "Convert to Job" }).click();
        await page.waitForURL(/\/dashboard\/jobs\/[0-9a-f-]{36}/, {
          timeout: 20000,
        });

        state.jobId = extractUuidFromUrl(page.url(), "jobs");
        expect(state.jobId).toBeTruthy();

        await approveMaterialsAndSchedule(state.jobId!);
        await page.reload();
        await expect(page.getByRole("button", { name: "Start Job" })).toBeVisible({
          timeout: 15000,
        });
        await page.getByRole("button", { name: "Start Job" }).click();

        await expect
          .poll(async () => (await loadJobByEstimateId(state.estimateId!))?.status, {
            message: "job should move to active",
          })
          .toBe("active");

        await expect(page.getByText("Final Invoice")).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole("button", { name: "Mark as Paid" })).toBeVisible();
      });

      await test.step("Owner sends final invoice and completes the job", async () => {
        await page.getByRole("button", { name: "Mark as Paid" }).click();
        await expect(
          page.getByRole("heading", { name: "Mark Job as Paid" })
        ).toBeVisible({ timeout: 10000 });
        await page.getByRole("button", { name: "Confirm & Send Invoice" }).click();

        await expect
          .poll(async () => (await loadJobByEstimateId(state.estimateId!))?.status, {
            message: "job should be completed by invoice generation",
          })
          .toBe("complete");

        const job = await loadJobByEstimateId(state.estimateId!);
        expect(job?.paid_at).toBeTruthy();
        expect(job?.invoice_url).toBeTruthy();

        const invoice = await loadInvoice(state.jobId!);
        state.invoiceNumber = invoice?.invoice_number ?? null;
        expect(invoice?.invoice_number).toBeTruthy();
        expect(invoice?.pdf_url).toBeTruthy();

        await page.reload();
        await expect(page.getByText(/Job Complete — Invoice Sent|Job Completed/i).first()).toBeVisible({
          timeout: 15000,
        });
        await expect(
          page.getByRole("link", { name: /View Invoice PDF|Download Invoice PDF/i }).first()
        ).toBeVisible();
      });
    } finally {
      await cleanupFlow(state);
    }
  });
});
