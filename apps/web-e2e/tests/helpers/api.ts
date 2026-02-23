import * as jose from "jose";

const API_BASE = "http://localhost:3001";
const E2E_TEST_SECRET = "openslack-e2e-test-secret-do-not-use-in-prod";
const PROJECT_ID = "924565c5-6377-44b7-aa75-6b7de8d311f4";

export interface ApiUser {
  userId: string;
  displayName: string;
  email: string;
}

export const DEFAULT_USER: ApiUser = {
  userId: "e2e-test-user-001",
  displayName: "Test User",
  email: "test@openslack.dev",
};

export const SECOND_USER: ApiUser = {
  userId: "e2e-test-user-002",
  displayName: "Second User",
  email: "second@openslack.dev",
};

export const SHOWCASE_ALICE: ApiUser = { userId: "Alice Johnson", displayName: "Alice Johnson", email: "alice@openslack.dev" };
export const SHOWCASE_BOB: ApiUser = { userId: "Bob Martinez", displayName: "Bob Martinez", email: "bob@openslack.dev" };
export const SHOWCASE_CAROL: ApiUser = { userId: "Carol Chen", displayName: "Carol Chen", email: "carol@openslack.dev" };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function signToken(user: ApiUser): Promise<string> {
  const secret = new TextEncoder().encode(E2E_TEST_SECRET);
  return new jose.SignJWT({
    email: user.email,
    name: user.displayName,
    email_verified: true,
    project_id: PROJECT_ID,
    branch_id: "main",
    refresh_token_id: `e2e-rt-${user.userId}`,
    role: "authenticated",
    selected_team_id: null,
    is_anonymous: false,
    is_restricted: false,
    restricted_reason: null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuer(`https://api.stack-auth.com/api/v1/projects/${PROJECT_ID}`)
    .setAudience(PROJECT_ID)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
}

interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export class ApiHelper {
  private tokenPromise: Promise<string>;
  private workspaceSlug: string;

  constructor(user: ApiUser = DEFAULT_USER, workspaceSlug = "default") {
    this.tokenPromise = signToken(user);
    this.workspaceSlug = workspaceSlug;
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const token = await this.tokenPromise;
    const method = (init?.method ?? "GET").toUpperCase();
    const maxAttempts = method === "GET" ? 5 : 6;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(`${API_BASE}${path}`, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...init?.headers,
          },
        });

        if (res.ok) return res;
        const retriable = res.status === 404 || res.status === 408 || res.status === 429 || res.status >= 500;
        if (!retriable || attempt === maxAttempts) return res;
      } catch (error) {
        if (attempt === maxAttempts) throw error;
      }
      await sleep(Math.min(250 * 2 ** (attempt - 1), 2000));
    }

    throw new Error(`Request failed unexpectedly: ${method} ${path}`);
  }

  async createWorkspace(name: string): Promise<{ id: string; name: string; slug: string }> {
    const res = await this.request("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Failed to create workspace "${name}": ${res.status} ${body.slice(0, 160)}`);
    }
    return (await res.json()) as { id: string; name: string; slug: string };
  }

  async getChannels(): Promise<Channel[]> {
    const res = await this.request(`/api/workspaces/${this.workspaceSlug}/channels`);
    return (await res.json()) as Channel[];
  }

  async getChannelByName(name: string): Promise<Channel> {
    const channels = await this.getChannels();
    const channel = channels.find((c) => c.name === name);
    if (!channel) throw new Error(`Channel "${name}" not found`);
    return channel;
  }

  async joinChannel(channelId: string): Promise<void> {
    const res = await this.request(
      `/api/workspaces/${this.workspaceSlug}/channels/${channelId}/join`,
      { method: "POST" },
    );
    if (!res.ok) {
      throw new Error(`Failed to join channel: ${res.status}`);
    }
  }

  async createChannel(name: string, description?: string): Promise<Channel> {
    const res = await this.request(`/api/workspaces/${this.workspaceSlug}/channels`, {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
    return (await res.json()) as Channel;
  }

  async createPrivateChannel(name: string, description?: string): Promise<Channel> {
    const res = await this.request(`/api/workspaces/${this.workspaceSlug}/channels`, {
      method: "POST",
      body: JSON.stringify({ name, description, type: "private" }),
    });
    return (await res.json()) as Channel;
  }

  async addChannelMember(channelId: string, userId: string): Promise<void> {
    const res = await this.request(
      `/api/workspaces/${this.workspaceSlug}/channels/${channelId}/members`,
      { method: "POST", body: JSON.stringify({ userId }) },
    );
    if (!res.ok) {
      throw new Error(`Failed to add channel member: ${res.status}`);
    }
  }

  async removeChannelMember(channelId: string, userId: string): Promise<void> {
    const res = await this.request(
      `/api/workspaces/${this.workspaceSlug}/channels/${channelId}/members/${userId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      throw new Error(`Failed to remove channel member: ${res.status}`);
    }
  }

  async createMessage(channelId: string, content: string): Promise<Message> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await this.request(
        `/api/workspaces/${this.workspaceSlug}/channels/${channelId}/messages`,
        { method: "POST", body: JSON.stringify({ content }) },
      );
      if (res.ok) return (await res.json()) as Message;
      // Retry on server errors (load-related)
      if (attempt < 2) await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Failed to create message after 3 attempts`);
  }

  async getMessages(
    channelId: string,
    limit = 50,
  ): Promise<{ messages: Message[]; nextCursor: string | null }> {
    const res = await this.request(
      `/api/workspaces/${this.workspaceSlug}/channels/${channelId}/messages?limit=${limit}`,
    );
    return (await res.json()) as { messages: Message[]; nextCursor: string | null };
  }

  async createThreadReply(channelId: string, parentMessageId: string, content: string): Promise<Message> {
    const res = await this.request(
      `/api/workspaces/${this.workspaceSlug}/channels/${channelId}/messages/${parentMessageId}/replies`,
      { method: "POST", body: JSON.stringify({ content }) },
    );
    return (await res.json()) as Message;
  }

  async toggleReaction(messageId: string, emoji: string): Promise<{ reactions: { emoji: string; count: number; userIds: string[] }[] }> {
    const res = await this.request(`/api/messages/${messageId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    });
    return (await res.json()) as { reactions: { emoji: string; count: number; userIds: string[] }[] };
  }

  async editMessage(messageId: string, content: string): Promise<Message> {
    const res = await this.request(`/api/messages/${messageId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
    return (await res.json()) as Message;
  }

  async deleteMessage(messageId: string): Promise<{ ok: boolean }> {
    const res = await this.request(`/api/messages/${messageId}`, {
      method: "DELETE",
    });
    return (await res.json()) as { ok: boolean };
  }

  async getChannelMembers(channelId: string): Promise<{ id: string; displayName: string; email: string; avatarUrl: string | null; joinedAt: string }[]> {
    const res = await this.request(`/api/workspaces/${this.workspaceSlug}/channels/${channelId}/members`);
    return (await res.json()) as { id: string; displayName: string; email: string; avatarUrl: string | null; joinedAt: string }[];
  }

  async getMembers(): Promise<{ id: string; displayName: string; email: string; avatarUrl: string | null }[]> {
    const res = await this.request(`/api/workspaces/${this.workspaceSlug}/members`);
    return (await res.json()) as { id: string; displayName: string; email: string; avatarUrl: string | null }[];
  }

  async createDm(userId: string): Promise<{ channel: Channel & { type: string }; otherUser: { id: string; displayName: string } }> {
    const res = await this.request(`/api/workspaces/${this.workspaceSlug}/dm`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    return (await res.json()) as { channel: Channel & { type: string }; otherUser: { id: string; displayName: string } };
  }

  async getDms(): Promise<{ channel: Channel & { type: string }; otherUser: { id: string; displayName: string } }[]> {
    const res = await this.request(`/api/workspaces/${this.workspaceSlug}/dm`);
    return (await res.json()) as { channel: Channel & { type: string }; otherUser: { id: string; displayName: string } }[];
  }

  async createInvite(): Promise<{ id: string; code: string }> {
    const res = await this.request(`/api/workspaces/${this.workspaceSlug}/invites`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error(`Failed to create invite: ${res.status}`);
    }
    return (await res.json()) as { id: string; code: string };
  }

  async acceptInvite(code: string): Promise<{ slug: string }> {
    const res = await this.request(`/api/invites/${code}/accept`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error(`Failed to accept invite: ${res.status}`);
    }
    return (await res.json()) as { slug: string };
  }

  async deleteWorkspace(): Promise<void> {
    await this.request(`/api/workspaces/${this.workspaceSlug}`, { method: "DELETE" });
  }

  async searchMessages(
    q: string,
    options?: { channelId?: string; userId?: string; limit?: number; offset?: number },
  ): Promise<{ results: { messageId: string; headline: string; channelId: string }[]; total: number }> {
    const params = new URLSearchParams({ q });
    if (options?.channelId) params.set("channelId", options.channelId);
    if (options?.userId) params.set("userId", options.userId);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    const res = await this.request(
      `/api/workspaces/${this.workspaceSlug}/search?${params.toString()}`,
    );
    return (await res.json()) as { results: { messageId: string; headline: string; channelId: string }[]; total: number };
  }

  async getUnreadCounts(): Promise<Record<string, number>> {
    const res = await this.request(`/api/workspaces/${this.workspaceSlug}/unread-counts`);
    return (await res.json()) as Record<string, number>;
  }

  async markChannelAsRead(channelId: string): Promise<{ ok: boolean }> {
    const res = await this.request(
      `/api/workspaces/${this.workspaceSlug}/channels/${channelId}/read`,
      { method: "POST" },
    );
    return (await res.json()) as { ok: boolean };
  }

  async uploadFile(
    name: string,
    content: string | Buffer,
    mimeType: string,
  ): Promise<{ id: string; filename: string; mimeType: string; size: number }> {
    const token = await this.tokenPromise;
    const blobContent = typeof content === "string" ? content : new Uint8Array(content);
    const blob = new Blob([blobContent], { type: mimeType });
    const file = new File([blob], name, { type: mimeType });
    const form = new FormData();
    form.append("files", file);

    const res = await fetch(`${API_BASE}/api/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }
    const body = (await res.json()) as {
      attachments: { id: string; filename: string; mimeType: string; size: number }[];
    };
    return body.attachments[0]!;
  }
}

export function createApi(user?: ApiUser, workspaceSlug?: string): ApiHelper {
  return new ApiHelper(user, workspaceSlug);
}
