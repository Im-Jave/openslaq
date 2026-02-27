# Desktop Backlog (Active)

How to use this doc:
- Track native desktop app features needed to match Slaq's desktop experience.
- Keep only open or in-progress work here.
- Move completed initiatives to an archive snapshot.

## High Impact

### D-002: macOS Dock Badge (Unread Count)
- Status: Done
- Impact: High
- Owner: —
- Estimate: Low
- Dependencies: Unread mention count from chat store, macOS dock badge API
- Summary: Show an unread mention count badge on the macOS dock icon, matching Slaq's behavior.
- Acceptance criteria:
  - Dock icon shows a numeric badge for unread mentions.
  - Badge clears when all mentions are read.
  - Badge updates in real-time as new mentions arrive or are read.

### D-003: Native Menu Bar
- Status: Done
- Impact: High
- Owner: —
- Estimate: Medium
- Dependencies: Tauri menu API, keyboard shortcut registration
- Summary: Add a full native menu bar (File, Edit, View, Window, Help) with standard and app-specific actions.
- Acceptance criteria:
  - Menu bar includes File (New Message, Preferences, Quit), Edit (Undo, Cut, Copy, Paste, Select All), View (Zoom In/Out, Full Screen, Toggle Sidebar), Window (Minimize, Close), Help.
  - Menu items trigger corresponding app actions.
  - Standard OS shortcuts (Cmd+C, Cmd+V, Cmd+Q, etc.) work reliably.

### D-004: Desktop Keyboard Shortcuts
- Status: Open
- Impact: High
- Owner: —
- Estimate: Medium
- Dependencies: D-003 (menu bar wiring), app navigation routes
- Summary: Implement the full set of Slaq-style keyboard shortcuts that are only available in the desktop app (not browser).
- Acceptance criteria:
  - Cmd+N / Ctrl+N — Compose new message.
  - Cmd+Shift+K / Ctrl+Shift+K — Browse DMs.
  - Cmd+Shift+T / Ctrl+Shift+T — Open Threads view.
  - Cmd+Shift+M / Ctrl+Shift+M — Open Activity view.
  - Cmd+Shift+L / Ctrl+Shift+L — Browse channels.
  - Cmd+Shift+I / Ctrl+Shift+I — Open conversation details.
  - Cmd+Shift+H / Ctrl+Shift+H — Start/join huddle.
  - Cmd+Shift+Space / Ctrl+Shift+Space — Toggle huddle mute.
  - Cmd+, / Ctrl+, — Open preferences.
  - Cmd+. / Ctrl+. — Toggle right sidebar.
  - Cmd+Shift+Y / Ctrl+Shift+Y — Set status.
  - Cmd+[1-9] / Ctrl+[1-9] — Switch to workspace by position.
  - F11 / Ctrl+Cmd+F — Full screen.

### D-005: Deep Linking Protocol Handler
- Status: Done
- Impact: High
- Owner: —
- Estimate: Medium
- Dependencies: Tauri deep-link plugin, app routing
- Summary: Register an `openslaq://` URL scheme so external links open directly in the desktop app, navigating to the correct workspace, channel, DM, or thread.
- Acceptance criteria:
  - `openslaq://open` opens the app.
  - `openslaq://channel?team={ID}&id={ID}` opens a specific channel.
  - `openslaq://user?team={ID}&id={ID}` opens a DM with a specific user.
  - `openslaq://thread?team={ID}&channel={ID}&message={ID}` opens a thread.
  - Unrecognized paths fall back to opening the app.
  - Protocol is registered on app install (macOS, Windows, Linux).

### D-006: System Idle Detection for Presence
- Status: Open
- Impact: High
- Owner: —
- Estimate: Medium
- Dependencies: Tauri or OS-level idle API, presence socket events
- Summary: Detect when the user's system is idle or locked and automatically set their presence to "away." Restore "active" when they return.
- Acceptance criteria:
  - After a configurable idle timeout (default 10 minutes), presence is set to away.
  - Waking the machine, unlocking the screen, or interacting with the app sets presence back to active.
  - Idle timeout is configurable in preferences.

### D-007: Minimize to Tray on Window Close
- Status: Done
- Impact: High
- Owner: —
- Estimate: Low
- Dependencies: Tauri tray API
- Summary: When the user closes the app window, minimize to the system tray instead of quitting, keeping the app running in the background for notifications.
- Acceptance criteria:
  - Closing the window hides the app to the tray instead of quitting.
  - Clicking the tray icon restores the window.
  - Cmd+Q / Ctrl+Q or "Quit" from the menu/tray actually exits the app.
  - Behavior is configurable (preference to quit on close vs. minimize to tray).

### D-008: Launch at Login
- Status: Done
- Impact: High
- Owner: —
- Estimate: Low
- Dependencies: Tauri autostart plugin or OS-native registration
- Summary: Option to automatically start the desktop app when the user logs in to their computer.
- Acceptance criteria:
  - Toggle in preferences to enable/disable launch at login.
  - App starts minimized to tray when auto-launched.
  - Works on macOS, Windows, and Linux.

## Medium Impact

### D-009: Tray Context Menu
- Status: Done (partial — Show/Quit implemented; Set Status and Pause Notifications deferred)
- Impact: Medium
- Owner: —
- Estimate: Low
- Dependencies: Tauri tray API
- Summary: Right-clicking the tray icon shows a context menu with quick actions.
- Acceptance criteria:
  - Menu includes: Set Status, Pause Notifications, Show/Hide Window, Quit.
  - Actions trigger the corresponding app behavior.

### D-010: Window Position & Size Persistence
- Status: Open
- Impact: Medium
- Owner: —
- Estimate: Low
- Dependencies: Tauri window state plugin or local storage
- Summary: Remember and restore the app window's position, size, and maximized state across restarts.
- Acceptance criteria:
  - Window position and size are saved on close.
  - Window is restored to the saved position and size on next launch.
  - Falls back to default size/position if saved state is invalid (e.g. monitor disconnected).

### D-011: Native Notification Inline Reply (macOS)
- Status: Open
- Impact: Medium
- Owner: —
- Estimate: Medium
- Dependencies: Tauri notification plugin with actions, message send API
- Summary: Support replying to messages directly from macOS native notifications without opening the app.
- Acceptance criteria:
  - Notifications include a "Reply" action button.
  - User can type a reply in the notification and send it.
  - Reply is posted to the correct channel/DM/thread.

### D-012: Notification Click Navigation
- Status: Open
- Impact: Medium
- Owner: —
- Estimate: Low
- Dependencies: Notification payload with channel/message context
- Summary: Clicking a desktop notification focuses the app window and navigates to the specific message that triggered it.
- Acceptance criteria:
  - Clicking a notification opens/focuses the app.
  - App navigates to the correct channel and scrolls to the relevant message.
  - Works for channel messages, DMs, and thread replies.

### D-013: "Open in Desktop App" Web Banner
- Status: Open
- Impact: Medium
- Owner: —
- Estimate: Low
- Dependencies: D-005 (protocol handler), detection of installed desktop app
- Summary: Show a banner on the web app suggesting users open the current page in the desktop app if it's installed.
- Acceptance criteria:
  - Banner appears at the top of the web app for users who have the desktop app.
  - "Open in app" button constructs an `openslaq://` deep link for the current page.
  - Banner can be dismissed and stays dismissed for the session.

### D-014: Background Socket Connection
- Status: Open
- Impact: Medium
- Owner: —
- Estimate: Medium
- Dependencies: Socket.IO reconnection logic, missed-message sync
- Summary: Keep the Socket.IO connection alive when the app is minimized or in the background, and catch up on missed messages after network disruptions or sleep/wake.
- Acceptance criteria:
  - Socket stays connected when the window is minimized or hidden to tray.
  - After sleep/wake or network reconnection, missed messages are fetched and applied.
  - Unread counts and notifications remain accurate during background operation.

### D-015: Multi-Window Support (Pop-Out Conversations)
- Status: Open
- Impact: Medium
- Owner: —
- Estimate: High
- Dependencies: Tauri multi-window API, shared state across windows
- Summary: Let users pop out threads, DMs, or channels into separate windows.
- Acceptance criteria:
  - "Open in new window" action on threads and DMs.
  - Pop-out windows are lightweight and show only the conversation.
  - State (messages, typing indicators, presence) stays in sync across windows.
  - Pop-out windows close when the main window quits.

### D-016: Global Show/Hide Hotkey
- Status: Open
- Impact: Medium
- Owner: —
- Estimate: Low
- Dependencies: Tauri global shortcut plugin
- Summary: Register a system-wide keyboard shortcut to instantly show or hide the app window from anywhere.
- Acceptance criteria:
  - Default hotkey (e.g. Cmd+Shift+O) toggles app visibility.
  - Hotkey is configurable in preferences.
  - Works even when the app is in the background or another app is focused.

### D-017: Notification Sound Customization
- Status: Open
- Impact: Medium
- Owner: —
- Estimate: Low
- Dependencies: Sound file assets, notification preferences UI
- Summary: Let users choose from a set of notification sounds or disable sounds entirely.
- Acceptance criteria:
  - Preferences include a notification sound picker.
  - Multiple sound options available.
  - "No sound" option to disable notification audio.
  - Selected sound persists across sessions.

### D-018: OS Do Not Disturb / Focus Mode Sync
- Status: Open
- Impact: Medium
- Owner: —
- Estimate: Medium
- Dependencies: OS-level DND/Focus API access, notification suppression logic
- Summary: Detect when the OS Do Not Disturb or Focus mode is active and suppress OpenSlaq notifications accordingly.
- Acceptance criteria:
  - When macOS Focus mode is active, notifications are suppressed.
  - Presence status optionally reflects DND state.
  - Notifications resume when Focus mode is turned off.

## Lower Impact

### D-019: Native Context Menus
- Status: Open
- Impact: Low
- Owner: —
- Estimate: Medium
- Dependencies: Tauri context menu API, message action handlers
- Summary: Replace browser-style right-click menus with native OS context menus for messages and other elements.
- Acceptance criteria:
  - Right-clicking a message shows a native context menu with actions (Reply, Edit, Delete, Pin, Copy Link, etc.).
  - Right-clicking text selections shows Cut/Copy/Paste.
  - Menus match the OS look and feel.

### D-020: Native File Save Dialog for Downloads
- Status: Open
- Impact: Low
- Owner: —
- Estimate: Low
- Dependencies: Tauri dialog plugin
- Summary: Use the native OS file save dialog when downloading attachments instead of the browser default.
- Acceptance criteria:
  - Clicking "Download" on an attachment opens a native save-as dialog.
  - User can choose save location and filename.
  - Download progress is shown in the app.

### D-021: Spell Check with OS Dictionary
- Status: Open
- Impact: Low
- Owner: —
- Estimate: Low
- Dependencies: WebView spell-check configuration
- Summary: Enable OS-native spell checking in the message editor, using the system dictionary and user-added words.
- Acceptance criteria:
  - Misspelled words are underlined in the message input.
  - Right-click shows spelling suggestions from the OS dictionary.
  - User can add words to the dictionary.

### D-022: Windows Build Target
- Status: Open
- Impact: Low
- Owner: —
- Estimate: Medium
- Dependencies: CI/CD pipeline for Windows, code signing certificate
- Summary: Build and distribute the desktop app for Windows (MSI/NSIS installer).
- Acceptance criteria:
  - Windows installer is produced by the build pipeline.
  - Auto-updater works on Windows.
  - All desktop features (tray, notifications, shortcuts) work on Windows.

### D-023: Linux Build Target
- Status: Open
- Impact: Low
- Owner: —
- Estimate: Medium
- Dependencies: CI/CD pipeline for Linux, package format decisions
- Summary: Build and distribute the desktop app for Linux (AppImage and/or .deb).
- Acceptance criteria:
  - Linux packages are produced by the build pipeline.
  - Auto-updater works on Linux.
  - Tray icon, notifications, and shortcuts work on major Linux desktops (GNOME, KDE).

### D-024: Code Signing & Notarization (macOS)
- Status: Open
- Impact: Low
- Owner: —
- Estimate: Medium
- Dependencies: Apple Developer certificate, CI/CD notarization step
- Summary: Sign and notarize the macOS app bundle so users don't see Gatekeeper warnings.
- Acceptance criteria:
  - App is signed with a valid Developer ID certificate.
  - App is notarized with Apple and passes Gatekeeper checks.
  - DMG is also signed.
  - CI/CD pipeline handles signing and notarization automatically.

### D-025: Screen Sharing Picker for Huddles
- Status: Open
- Impact: Low
- Owner: —
- Estimate: High
- Dependencies: Tauri screen capture API, huddle/WebRTC infrastructure
- Summary: Integrate with the native OS screen/window picker to enable screen sharing in huddles.
- Acceptance criteria:
  - "Share screen" button in huddle UI opens the native screen/window picker.
  - Selected screen or window is shared via WebRTC to other huddle participants.
  - User can stop sharing at any time.
  - Shared screen is visible to all huddle participants in real-time.
