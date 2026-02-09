import { describe, it, expect } from "vitest";

describe("Auth client module", () => {
  it("exports a configured auth client with expected methods", async () => {
    const { authClient } = await import("@/lib/auth-client");

    expect(authClient).toBeDefined();
    expect(authClient.signIn).toBeDefined();
    expect(authClient.signIn.social).toBeDefined();
    expect(authClient.signOut).toBeDefined();
    expect(authClient.useSession).toBeDefined();
    expect(authClient.getSession).toBeDefined();
  });
});
