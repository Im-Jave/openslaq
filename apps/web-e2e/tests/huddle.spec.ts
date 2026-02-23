import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Huddle UI", () => {
  test("huddle start button visible in channel header", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await expect(page.getByTestId("huddle-start-button")).toBeVisible();
  });

  test("start huddle shows huddle bar in sidebar", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // No huddle bar initially
    await expect(page.getByTestId("huddle-bar")).not.toBeVisible();

    // Start huddle — mock getUserMedia since Playwright doesn't have real mic access
    await page.evaluate(() => {
      // Create a silent audio track for testing
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const dest = audioContext.createMediaStreamDestination();
      oscillator.connect(dest);
      oscillator.start();

      navigator.mediaDevices.getUserMedia = async () => dest.stream;
    });

    await page.getByTestId("huddle-start-button").click();

    // Huddle bar should appear
    await expect(page.getByTestId("huddle-bar")).toBeVisible();

    // Header should show "In huddle"
    await expect(page.getByTestId("huddle-in-progress")).toBeVisible();
  });

  test("leave huddle removes huddle bar", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Mock getUserMedia
    await page.evaluate(() => {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const dest = audioContext.createMediaStreamDestination();
      oscillator.connect(dest);
      oscillator.start();
      navigator.mediaDevices.getUserMedia = async () => dest.stream;
    });

    await page.getByTestId("huddle-start-button").click();
    await expect(page.getByTestId("huddle-bar")).toBeVisible();

    // Leave huddle
    await page.getByTestId("huddle-leave").click();
    await expect(page.getByTestId("huddle-bar")).not.toBeVisible();

    // Start button should be visible again
    await expect(page.getByTestId("huddle-start-button")).toBeVisible();
  });

  test("mute toggle changes icon", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Mock getUserMedia
    await page.evaluate(() => {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const dest = audioContext.createMediaStreamDestination();
      oscillator.connect(dest);
      oscillator.start();
      navigator.mediaDevices.getUserMedia = async () => dest.stream;
    });

    await page.getByTestId("huddle-start-button").click();
    await expect(page.getByTestId("huddle-bar")).toBeVisible();

    // Get the mute toggle button
    const muteToggle = page.getByTestId("huddle-mute-toggle");
    await expect(muteToggle).toBeVisible();

    // Initially the button should show the microphone (unmuted) icon
    await expect(muteToggle.locator("svg path[d*='M19 11']")).toBeVisible();

    // Click to mute
    await muteToggle.click();
    // Muted icon has a different path (speaker with X)
    await expect(muteToggle.locator("svg path[d*='M5.586']")).toBeVisible();

    // Click to unmute
    await muteToggle.click();
    await expect(muteToggle.locator("svg path[d*='M19 11']")).toBeVisible();
  });
});
