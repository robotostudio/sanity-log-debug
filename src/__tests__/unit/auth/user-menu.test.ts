import { describe, it, expect } from "vitest";
import { getInitials } from "@/components/auth/user-menu";

describe("getInitials", () => {
  it("returns initials for a full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns single initial for a single name", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("truncates to 2 characters for long names", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });

  it("returns 'U' for null or undefined", () => {
    expect(getInitials(null)).toBe("U");
    expect(getInitials(undefined)).toBe("U");
  });

  it("returns 'U' for empty string", () => {
    expect(getInitials("")).toBe("U");
  });

  it("handles extra whitespace correctly", () => {
    expect(getInitials("  John  Doe  ")).toBe("JD");
  });
});
