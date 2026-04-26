import { expect, type BrowserContext, type Page, type APIRequestContext } from "@playwright/test";

export const signaturePng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9pC6kX8AAAAASUVORK5CYII=",
  "base64"
);

export async function drawSignature(page: Page, canvasSelector = "canvas") {
  const canvas = page.locator(canvasSelector).first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Signature canvas bounding box not found");
  }

  const startX = box.x + 40;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 40, startY - 18, { steps: 6 });
  await page.mouse.move(startX + 85, startY + 12, { steps: 6 });
  await page.mouse.move(startX + 125, startY - 10, { steps: 6 });
  await page.mouse.up();
}

export async function acceptEstimateThroughPage(
  context: BrowserContext,
  estimateId: string,
  acceptToken: string,
  customerName: string,
  customerEmail: string
) {
  const acceptPage = await context.newPage();
  try {
    await acceptPage.goto(`/accept/${estimateId}/${acceptToken}`);
    await expect(
      acceptPage.getByRole("heading", { name: "Accept Estimate" })
    ).toBeVisible();

    await acceptPage.getByPlaceholder("John Smith").fill(customerName);
    await acceptPage.getByPlaceholder("john@example.com").fill(customerEmail);
    await drawSignature(acceptPage);
    await acceptPage.getByRole("checkbox").check();

    const response = await postAcceptanceRequest(context.request, {
      estimateId,
      token: acceptToken,
      name: customerName,
      email: customerEmail,
    });
    expect(response.ok()).toBeTruthy();

    await acceptPage.reload();

    await expect(
      acceptPage.getByRole("heading", { name: "Estimate Accepted" })
    ).toBeVisible({ timeout: 15000 });
  } finally {
    await acceptPage.close();
  }
}

export async function postAcceptanceRequest(
  request: APIRequestContext,
  {
    estimateId,
    token,
    name,
    email,
  }: {
    estimateId: string;
    token: string;
    name: string;
    email: string;
  }
) {
  return request.post("/api/accept", {
    multipart: {
      estimateId,
      token,
      name,
      email,
      signature: {
        name: "signature.png",
        mimeType: "image/png",
        buffer: signaturePng,
      },
    },
  });
}
