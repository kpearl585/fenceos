import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.SMOKE_BASE_URL;
const cookieHeader = process.env.SMOKE_SESSION_COOKIE;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const keepData = process.env.SMOKE_KEEP_DATA === "1";

if (!baseUrl) {
  console.log("[smoke:owner-flow] SMOKE_BASE_URL not set. Skipping seeded owner flow.");
  process.exit(0);
}

if (!cookieHeader) {
  console.log("[smoke:owner-flow] SMOKE_SESSION_COOKIE not set. Skipping seeded owner flow.");
  process.exit(0);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.log(
    "[smoke:owner-flow] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Skipping seeded owner flow."
  );
  process.exit(0);
}

const origin = baseUrl.replace(/\/$/, "");
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const state = {
  estimateId: null,
  customerId: null,
  jobId: null,
  orgId: null,
  invoiceNumber: null,
};

const signaturePng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9pC6kX8AAAAASUVORK5CYII=",
  "base64"
);

function normalizeText(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function readAttr(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(pattern);
  return match ? match[2] ?? match[3] ?? match[4] ?? "" : null;
}

function extractForms(html, pagePath) {
  const forms = [];
  const regex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;

  for (const match of html.matchAll(regex)) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const hiddenInputs = [];
    const buttons = [];

    for (const inputMatch of body.matchAll(/<input\b([^>]*)>/gi)) {
      const tag = inputMatch[0];
      const type = (readAttr(tag, "type") || "text").toLowerCase();
      if (type !== "hidden") continue;
      const name = readAttr(tag, "name");
      if (!name) continue;
      hiddenInputs.push({
        name,
        value: readAttr(tag, "value") ?? "",
      });
    }

    for (const buttonMatch of body.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
      const tag = buttonMatch[0];
      const type = (readAttr(tag, "type") || "submit").toLowerCase();
      if (type !== "submit") continue;
      buttons.push(normalizeText(buttonMatch[2] ?? tag));
    }

    forms.push({
      action: readAttr(attrs, "action") || pagePath,
      method: (readAttr(attrs, "method") || "post").toUpperCase(),
      hiddenInputs,
      buttons,
      html: match[0],
    });
  }

  return forms;
}

async function request(path, init = {}) {
  return fetch(new URL(path, origin), {
    redirect: "manual",
    headers: {
      cookie: cookieHeader,
      ...(init.headers ?? {}),
    },
    ...init,
  });
}

async function requestHtml(path, expectedStatuses = [200]) {
  const response = await request(path);
  assert.ok(
    expectedStatuses.includes(response.status),
    `Expected ${path} to return ${expectedStatuses.join("/")} but got ${response.status}`
  );
  return await response.text();
}

function appendField(formData, key, value) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    for (const entry of value) appendField(formData, key, entry);
    return;
  }
  formData.append(key, value);
}

async function submitFormFromPage(pagePath, submitLabel, fields = {}) {
  const html = await requestHtml(pagePath);
  const targetLabel = normalizeText(submitLabel).toLowerCase();
  const forms = extractForms(html, pagePath);
  const form = forms.find((entry) =>
    entry.buttons.some((button) => button.toLowerCase().includes(targetLabel))
  );

  assert.ok(form, `Could not find a form with submit label "${submitLabel}" on ${pagePath}`);

  const body = new FormData();
  for (const input of form.hiddenInputs) {
    body.append(input.name, input.value);
  }
  for (const [key, value] of Object.entries(fields)) {
    appendField(body, key, value);
  }

  const response = await request(form.action, {
    method: form.method,
    body,
  });

  return { form, response };
}

function extractEstimateId(location) {
  const match = location?.match(/\/dashboard\/estimates\/([0-9a-f-]+)/i);
  return match?.[1] ?? null;
}

async function loadEstimate() {
  assert.ok(state.estimateId, "Missing estimateId");
  const { data, error } = await supabase
    .from("estimates")
    .select("id, org_id, customer_id, title, status, total, accept_token, deposit_paid, accepted_at")
    .eq("id", state.estimateId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load estimate ${state.estimateId}: ${error?.message ?? "not found"}`);
  }

  state.orgId = data.org_id;
  state.customerId = data.customer_id;
  return data;
}

async function loadJobId() {
  assert.ok(state.estimateId, "Missing estimateId");
  const { data, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("estimate_id", state.estimateId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load job for estimate ${state.estimateId}: ${error.message}`);
  }

  state.jobId = data?.id ?? null;
  return state.jobId;
}

async function loadInvoice() {
  assert.ok(state.jobId, "Missing jobId");
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, pdf_url")
    .eq("job_id", state.jobId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load invoice for job ${state.jobId}: ${error.message}`);
  }

  state.invoiceNumber = data?.invoice_number ?? null;
  return data;
}

async function cleanup() {
  if (keepData || !state.estimateId) return;

  if (state.jobId) {
    await supabase.from("invoices").delete().eq("job_id", state.jobId);
    await supabase.from("job_line_items").delete().eq("job_id", state.jobId);
    await supabase.from("jobs").delete().eq("id", state.jobId);
  }

  await supabase.from("estimate_line_items").delete().eq("estimate_id", state.estimateId);
  await supabase.from("estimates").delete().eq("id", state.estimateId);

  if (state.customerId) {
    await supabase.from("customers").delete().eq("id", state.customerId);
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

    await supabase.storage.from("contracts").remove(contractPaths);
  }
}

async function main() {
  const smokeTag = Date.now().toString(36);
  const smokeTitle = `Smoke Flow ${smokeTag}`;
  const smokeCustomerName = `Smoke Customer ${smokeTag}`;
  const smokeCustomerEmail = `smoke-${smokeTag}@example.com`;

  try {
    const createResult = await submitFormFromPage("/dashboard/estimates/new", "Save Draft", {
      customerId: "__new__",
      customerName: smokeCustomerName,
      customerPhone: "555-0100",
      customerAddress: "123 Smoke Test Lane",
      title: smokeTitle,
      fenceType: "wood_privacy",
      linearFeet: "120",
      gateCount: "1",
      postSpacing: "8",
      height: "6",
    });

    assert.ok(
      [302, 303].includes(createResult.response.status),
      `Create estimate should redirect, got ${createResult.response.status}`
    );

    state.estimateId = extractEstimateId(createResult.response.headers.get("location"));
    assert.ok(state.estimateId, "Create estimate redirect did not include an estimate ID");

    const createdEstimate = await loadEstimate();
    assert.equal(createdEstimate.status, "draft", "New estimate should be created in draft status");
    assert.ok(createdEstimate.customer_id, "New estimate should be linked to the inline-created customer");

    const draftHtml = await requestHtml(`/dashboard/estimates/${state.estimateId}`);
    assert.match(draftHtml, new RegExp(smokeTitle), "Draft detail page should render the new estimate title");
    assert.match(draftHtml, /Send Quote/i, "Draft detail page should expose the Send Quote action");

    const sendQuoteResult = await submitFormFromPage(
      `/dashboard/estimates/${state.estimateId}`,
      "Send Quote",
      { estimateId: state.estimateId }
    );

    assert.ok(
      [302, 303].includes(sendQuoteResult.response.status),
      `Send quote should redirect, got ${sendQuoteResult.response.status}`
    );

    const quotedEstimate = await loadEstimate();
    assert.equal(quotedEstimate.status, "quoted", "Send quote should transition the estimate to quoted");
    assert.ok(quotedEstimate.accept_token, "Quoted estimate should have an accept token");

    const quotedHtml = await requestHtml(`/dashboard/estimates/${state.estimateId}`);
    assert.match(quotedHtml, /Share with Customer/i, "Quoted estimate page should expose the customer share panel");
    assert.match(quotedHtml, /PDF/i, "Quoted estimate page should expose PDF download");

    const acceptPagePath = `/accept/${state.estimateId}/${quotedEstimate.accept_token}`;
    const acceptHtml = await requestHtml(acceptPagePath);
    assert.match(acceptHtml, new RegExp(smokeTitle), "Public accept page should render the estimate title");
    assert.match(acceptHtml, /Accept Estimate/i, "Public accept page should expose the acceptance form");

    const acceptBody = new FormData();
    acceptBody.append("estimateId", state.estimateId);
    acceptBody.append("token", quotedEstimate.accept_token);
    acceptBody.append("name", smokeCustomerName);
    acceptBody.append("email", smokeCustomerEmail);
    acceptBody.append(
      "signature",
      new Blob([signaturePng], { type: "image/png" }),
      "signature.png"
    );

    const acceptResponse = await fetch(new URL("/api/accept", origin), {
      method: "POST",
      redirect: "manual",
      body: acceptBody,
    });
    assert.equal(acceptResponse.status, 200, "Public accept API should return 200");
    const acceptJson = await acceptResponse.json();
    assert.equal(acceptJson.success, true, "Public accept API should report success");

    const acceptedEstimate = await loadEstimate();
    assert.equal(acceptedEstimate.status, "accepted", "Accepted estimate should transition to accepted status");
    assert.ok(acceptedEstimate.accepted_at, "Accepted estimate should record accepted_at");

    const acceptedHtml = await requestHtml(`/dashboard/estimates/${state.estimateId}`);
    assert.match(
      acceptedHtml,
      /Deposit Required Before Scheduling/i,
      "Accepted estimate page should gate conversion behind deposit collection"
    );
    assert.match(acceptedHtml, /Collect Deposit/i, "Accepted estimate page should expose deposit collection");

    const depositTimestamp = new Date().toISOString();
    const { error: depositError } = await supabase
      .from("estimates")
      .update({
        status: "deposit_paid",
        deposit_paid: true,
        deposit_paid_at: depositTimestamp,
        stripe_payment_status: "paid",
        updated_at: depositTimestamp,
      })
      .eq("id", state.estimateId);

    if (depositError) {
      throw new Error(`Failed to simulate deposit payment: ${depositError.message}`);
    }

    const depositPaidHtml = await requestHtml(`/dashboard/estimates/${state.estimateId}`);
    assert.match(
      depositPaidHtml,
      /Convert to Job/i,
      "Deposit-paid estimate page should expose the Convert to Job action"
    );

    const convertResult = await submitFormFromPage(
      `/dashboard/estimates/${state.estimateId}`,
      "Convert to Job",
      { estimateId: state.estimateId }
    );

    assert.ok(
      [302, 303].includes(convertResult.response.status),
      `Convert to job should redirect, got ${convertResult.response.status}`
    );

    const convertedEstimate = await loadEstimate();
    assert.equal(
      convertedEstimate.status,
      "converted",
      "Converted estimate should transition to converted status"
    );

    const jobId = await loadJobId();
    assert.ok(jobId, "Conversion should create a linked job");

    const jobHtml = await requestHtml(`/dashboard/jobs/${jobId}`);
    assert.match(jobHtml, /Job Actions/i, "Converted job page should render actionable content");
    assert.match(jobHtml, /Start Job/i, "Scheduled job should expose the Start Job action");

    const { error: verificationStatusError } = await supabase
      .from("jobs")
      .update({
        material_verification_status: "foreman_approved",
        scheduled_date: new Date().toISOString().slice(0, 10),
      })
      .eq("id", jobId);

    if (verificationStatusError) {
      throw new Error(`Failed to simulate material verification approval: ${verificationStatusError.message}`);
    }

    const startJobResult = await submitFormFromPage(
      `/dashboard/jobs/${jobId}`,
      "Start Job",
      { jobId, newStatus: "active" }
    );

    assert.ok(
      [302, 303].includes(startJobResult.response.status),
      `Start job should redirect, got ${startJobResult.response.status}`
    );

    const { data: activeJob, error: activeJobError } = await supabase
      .from("jobs")
      .select("status")
      .eq("id", jobId)
      .single();

    if (activeJobError || !activeJob) {
      throw new Error(`Failed to load active job ${jobId}: ${activeJobError?.message ?? "not found"}`);
    }
    assert.equal(activeJob.status, "active", "Start Job should transition the job to active");

    const activeJobHtml = await requestHtml(`/dashboard/jobs/${jobId}`);
    assert.match(activeJobHtml, /Final Invoice/i, "Active job page should expose the final invoice section");
    assert.match(activeJobHtml, /Mark as Paid/i, "Active job page should expose the invoice action");

    const invoiceResponse = await request(`/api/jobs/${jobId}/invoice`, { method: "POST" });
    assert.equal(invoiceResponse.status, 200, "Owner invoice API should return 200");
    const invoiceJson = await invoiceResponse.json();
    assert.equal(invoiceJson.success, true, "Owner invoice API should report success");

    const { data: completedJob, error: completedJobError } = await supabase
      .from("jobs")
      .select("status, paid_at, invoice_url")
      .eq("id", jobId)
      .single();

    if (completedJobError || !completedJob) {
      throw new Error(`Failed to load completed job ${jobId}: ${completedJobError?.message ?? "not found"}`);
    }
    assert.equal(completedJob.status, "complete", "Invoice generation should mark the job complete");
    assert.ok(completedJob.paid_at, "Invoice generation should stamp paid_at");
    assert.ok(completedJob.invoice_url, "Invoice generation should persist invoice_url");

    const invoiceRecord = await loadInvoice();
    assert.ok(invoiceRecord?.invoice_number, "Invoice generation should create an invoice record");
    assert.ok(invoiceRecord?.pdf_url, "Invoice record should include a PDF URL");

    const completedJobHtml = await requestHtml(`/dashboard/jobs/${jobId}`);
    assert.match(completedJobHtml, /Job Complete/i, "Completed job page should render invoice completion state");
    assert.match(completedJobHtml, /View Invoice PDF|Download Invoice PDF/i, "Completed job page should expose invoice PDF access");

    console.log(
      `[smoke:owner-flow] Passed against ${origin} (estimate ${state.estimateId}, job ${jobId}, invoice ${state.invoiceNumber})`
    );
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error("[smoke:owner-flow] Failed:", error);
  process.exit(1);
});
