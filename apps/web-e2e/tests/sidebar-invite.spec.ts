import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Sidebar invite", () => {
  test("generate invite link via workspace dropdown and copy it", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    // Open the workspace dropdown
    await page.locator("button", { hasText: testWorkspace.name }).first().click();

    // Click "Invite People" menu item
    await page.getByRole("menuitem", { name: "Invite People" }).click();

    // Invite dialog should open and auto-load invite link
    await expect(page.getByText("Invite People")).toBeVisible();

    // Wait for invite link input to appear (auto-loaded)
    const inviteInput = page.locator("input[readonly]");
    await expect(inviteInput).toBeVisible();

    // Verify invite link contains /invite/ path
    const inviteValue = await inviteInput.inputValue();
    expect(inviteValue).toContain("/invite/");

    // Click "Copy Link" button
    await page.context().grantPermissions(["clipboard-write"]);
    await page.getByRole("button", { name: "Copy Link" }).click();

    // Verify button text changes to "Copied!"
    await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
  });
});
