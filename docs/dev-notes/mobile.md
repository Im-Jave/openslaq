# Mobile Dev Notes

Lessons learned from building the Expo/React Native mobile app.

## Expo Router

**Flat file routes, not nested directories for dynamic segments.**
Converting `[channelId].tsx` to a directory `[channelId]/` with a nested `_layout.tsx` + `index.tsx` causes a runtime crash (`NSInvalidArgumentException: attempt to insert nil object`). Nested Stack navigators inside dynamic route groups don't work reliably. Instead, keep screens as flat files at the same level (e.g. `[channelId].tsx` and `channel-members.tsx` as siblings under `(channels)/`).

**Typed route pathnames use bracket notation, not interpolation.**
When using `router.push()` with the object form `{ pathname, params }`, the pathname must use literal brackets:
```ts
// Wrong - TS error, won't match typed routes
router.push({ pathname: `/(app)/${slug}/(channels)/channel-members`, params: { channelId } })

// Correct - matches Expo Router's generated types
router.push({ pathname: "/(app)/[workspaceSlug]/(tabs)/(channels)/channel-members", params: { workspaceSlug: slug, channelId } })
```
The string form (`router.push(\`/(app)/${slug}/(channels)/${id}\`)`) works for simple navigation without extra params.

## Native Builds (iOS)

**Always clean-rebuild after dependency changes.**
If the app crashes at startup with `NSInvalidArgumentException` in `RCTThirdPartyComponentsProvider`, the native codegen is stale. Fix:
```bash
cd apps/mobile
npx expo prebuild --platform ios
cd ios && pod install && cd ..
rm -rf ios/build
bun run e2e:build
```

**Don't delete `ios/build` without running prebuild first.**
The build directory contains generated codegen files (`rnscreensJSI-generated.cpp`, etc.) that are created during prebuild. If you `rm -rf ios/build` and then run `xcodebuild` directly, it fails with "Build input file cannot be found". Always run `expo prebuild` before a clean build.

## Detox E2E Tests (iOS)

**`device.pressBack()` is Android-only.**
On iOS it logs a warning and does nothing. Tap the header back button text instead:
```ts
// The back button shows the previous screen's title
await element(by.text("Channels")).tap();

// Or the headerBackTitle if set on the previous screen
await element(by.text("Back")).tap();
```

**Dismiss the keyboard before tapping buttons in modals.**
When a TextInput has focus inside a Modal, the keyboard shifts the modal content and Detox can't hit-test buttons reliably. Use `tapReturnKey()` to dismiss:
```ts
await element(by.id("my-input")).typeText("hello");
await element(by.id("my-input")).tapReturnKey(); // dismiss keyboard
await element(by.id("submit-button")).tap();       // now hittable
```
Other tests dismiss the keyboard by tapping a visible sibling element (e.g. `message-list`), but inside modals there's often no good tap target.

**Blacklist Socket.IO for Detox sync.**
Socket.IO's long-polling prevents Detox's synchronization from settling. Every test suite needs:
```ts
await device.setURLBlacklist([".*socket\\.io.*"]);
await device.enableSynchronization();
```

**Native Alerts are accessible via `by.text()`.**
`Alert.alert()` buttons can be tapped with `element(by.text("Button Label")).tap()`. This works for both single and chained alerts.
