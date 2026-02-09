import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn(),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ value: 3 }]),
      }),
    }),
    query: {
      user: {
        findFirst: vi.fn(),
      },
      userProfile: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock("@/lib/db/user-profile-schema", () => ({
  userProfile: { userId: "user_id" },
}));

vi.mock("@/lib/db/logs-schema", () => ({
  files: { userId: "user_id" },
}));

describe("auth-helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrCreateUserProfile", () => {
    it("returns merged user + profile data", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.query.user.findFirst).mockResolvedValue({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        image: null,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        profile: { userId: "user-1", role: "admin", maxSources: 5, createdAt: new Date(), updatedAt: new Date() },
      } as any);

      const { getOrCreateUserProfile } = await import("@/lib/auth-helpers");
      const result = await getOrCreateUserProfile("user-1");

      expect(result).toEqual({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        image: null,
        role: "admin",
        maxSources: 5,
      });
    });
  });

  describe("isAdmin", () => {
    it("returns true for admin role", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.query.userProfile.findFirst).mockResolvedValue({
        role: "admin",
      } as any);

      const { isAdmin } = await import("@/lib/auth-helpers");
      const result = await isAdmin("user-1");
      expect(result).toBe(true);
    });

    it("returns false for user role", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.query.userProfile.findFirst).mockResolvedValue({
        role: "user",
      } as any);

      const { isAdmin } = await import("@/lib/auth-helpers");
      const result = await isAdmin("user-1");
      expect(result).toBe(false);
    });

    it("returns false when no profile exists", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.query.userProfile.findFirst).mockResolvedValue(undefined);

      const { isAdmin } = await import("@/lib/auth-helpers");
      const result = await isAdmin("user-1");
      expect(result).toBe(false);
    });
  });

  describe("getUserFileCount", () => {
    it("returns count of files owned by user", async () => {
      const { getUserFileCount } = await import("@/lib/auth-helpers");
      const result = await getUserFileCount("user-1");
      expect(result).toBe(3);
    });
  });
});
