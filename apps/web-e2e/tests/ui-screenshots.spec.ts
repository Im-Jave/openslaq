import { expect } from "@playwright/test";
import { test, createSecondUserApi } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { openWorkspaceSettings } from "./helpers/chat-ui";
import { SECOND_USER } from "./helpers/api";

test.describe("UI Screenshots", () => {
  test("workspace list page (with workspaces)", async ({ page, testWorkspace: _tw }) => {
    await setupMockAuth(page);
    await page.goto("/");
    await expect(page.getByText("Your Workspaces")).toBeVisible();
    await page.screenshot({ path: "test-results/workspace-list.png" });
  });

  test("invite accept page", async ({ page, testWorkspace }) => {
    const invite = await testWorkspace.api.createInvite();
    await setupMockAuth(page, {
      id: SECOND_USER.userId,
      displayName: SECOND_USER.displayName,
      email: SECOND_USER.email,
    });
    await page.goto(`/invite/${invite.code}`);
    await expect(page.getByRole("button", { name: "Accept Invite" })).toBeVisible();
    await page.screenshot({ path: "test-results/invite-accept.png", fullPage: true });
  });

  test("workspace settings page", async ({ page, testWorkspace }) => {
    // Add a second member first
    const invite = await testWorkspace.api.createInvite();
    const secondApi = createSecondUserApi(testWorkspace.slug, SECOND_USER);
    await secondApi.acceptInvite(invite.code);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await openWorkspaceSettings(page, testWorkspace.name);
    await expect(page.getByTestId("role-badge-e2e-test-user-001")).toBeVisible();
    await page.screenshot({ path: "test-results/workspace-settings.png", fullPage: true });
  });

  test("thread panel open", async ({ page, testWorkspace }) => {
    const generalChannel = await testWorkspace.api.getChannelByName("general");
    const parent = await testWorkspace.api.createMessage(generalChannel.id, "Here is a message with a thread!");
    await testWorkspace.api.createThreadReply(generalChannel.id, parent.id, "This is a reply in the thread");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    // Must click channel in sidebar to select it
    await page.getByText("# general").click();
    await expect(page.getByText("Here is a message with a thread!")).toBeVisible();

    // Hover message to reveal action bar, then click reply
    await page.getByText("Here is a message with a thread!").hover();
    await page.getByTestId("reply-action-trigger").click();
    await expect(page.getByText("This is a reply in the thread")).toBeVisible();
    await page.screenshot({ path: "test-results/thread-panel.png", fullPage: true });
  });

  test("search modal", async ({ page, testWorkspace }) => {
    const generalChannel = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.createMessage(generalChannel.id, "Searchable test message for screenshot");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    // Must click channel in sidebar to select it
    await page.getByText("# general").click();
    await expect(page.getByText("Searchable test message")).toBeVisible();

    // Open search
    await page.getByTestId("search-trigger").click();
    await expect(page.getByTestId("search-modal")).toBeVisible();

    // Type a search query and wait for results
    await page.getByTestId("search-input").fill("Searchable");
    await expect(page.getByText(/\d+ result/)).toBeVisible();
    await page.screenshot({ path: "test-results/search-modal.png", fullPage: true });
  });

  test("new DM dialog", async ({ page, testWorkspace }) => {
    // Add a second member
    const invite = await testWorkspace.api.createInvite();
    const secondApi = createSecondUserApi(testWorkspace.slug, SECOND_USER);
    await secondApi.acceptInvite(invite.code);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Click the + button next to Direct Messages to open the new DM dialog
    await page.getByTestId("new-dm-button").click();
    await expect(page.getByText("New Direct Message")).toBeVisible();
    await page.screenshot({ path: "test-results/new-dm-dialog.png", fullPage: true });
  });
});
