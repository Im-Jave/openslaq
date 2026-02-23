# OpenSlack

**Open-source Slack**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Built with Bun](https://img.shields.io/badge/built%20with-Bun-f9f1e1.svg)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/BilalG1/openslack/pulls)

<p align="center">
  <img src="docs/screenshots/channel-rich-text.png" alt="OpenSlack — channels with rich text, code blocks, and editor toolbar" width="100%" />
</p>

Real-time team messaging with channels, threads, DMs, huddles, search, and file sharing. Self-host in minutes with Docker.

## Quick Start

Prerequisites: [Bun](https://bun.sh) (v1.1+), [Docker](https://www.docker.com/)

```bash
git clone https://github.com/BilalG1/openslack.git
cd openslack
bun install
cp .env.example .env
docker compose up -d
bun run --filter @openslack/api db:migrate
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Feature Comparison

| Feature | Slack | OpenSlack |
| --- | :---: | :---: |
| **Messaging** | | |
| Channels (public & private) | :white_check_mark: | :white_check_mark: |
| Direct messages | :white_check_mark: | :white_check_mark: |
| Threaded replies | :white_check_mark: | :white_check_mark: |
| Rich text editor | :white_check_mark: | :white_check_mark: |
| Emoji reactions | :white_check_mark: | :white_check_mark: |
| Message edit & delete | :white_check_mark: | :white_check_mark: |
| File uploads & previews | :white_check_mark: | :white_check_mark: |
| Message search | :white_check_mark: | :white_check_mark: |
| @mentions | :white_check_mark: | — |
| **Real-time** | | |
| Typing indicators | :white_check_mark: | :white_check_mark: |
| Presence (online/offline) | :white_check_mark: | :white_check_mark: |
| Unread counts | :white_check_mark: | :white_check_mark: |
| Desktop notifications | :white_check_mark: | :white_check_mark: |
| **Huddles** | | |
| Voice huddles | :white_check_mark: | :white_check_mark: |
| Video huddles | :white_check_mark: | — |
| Screen sharing | :white_check_mark: | — |
| **Organization** | | |
| Workspaces | :white_check_mark: | :white_check_mark: |
| Invite links | :white_check_mark: | :white_check_mark: |
| Member roles | :white_check_mark: | :white_check_mark: |
| **UI** | | |
| Dark mode | :white_check_mark: | :white_check_mark: |
| Syntax-highlighted code blocks | :white_check_mark: | :white_check_mark: |
| **Platform** | | |
| Self-hosted | — | :white_check_mark: |
| Open source | — | :white_check_mark: |
| Bots & integrations | :white_check_mark: | — |
| Workflow builder | :white_check_mark: | — |
| Enterprise SSO/SAML | :white_check_mark: | — |

## Screenshots

<table>
  <tr>
    <td align="center"><strong>Threads</strong></td>
    <td align="center"><strong>Direct Messages</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/thread-panel.png" alt="Thread panel" width="100%" /></td>
    <td><img src="docs/screenshots/direct-messages.png" alt="Direct messages" width="100%" /></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><strong>Search</strong></td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/screenshots/search-modal.png" alt="Search modal" width="100%" /></td>
  </tr>
</table>

## License

[MIT](LICENSE)
