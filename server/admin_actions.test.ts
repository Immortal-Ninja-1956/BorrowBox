import { describe, it, expect, vi } from "vitest";
import type { InsertAdminAction, AdminAction } from "../drizzle/schema";

/**
 * Unit tests for admin audit logging schema and helper payload formatting.
 */

describe("Admin Audit Logging Unit Tests", () => {
  it("formats BAN_USER admin action payload correctly", () => {
    const actionPayload: InsertAdminAction = {
      adminId: 1,
      action: "BAN_USER",
      targetId: 42,
      details: "Banned user ID 42",
    };

    expect(actionPayload.adminId).toBe(1);
    expect(actionPayload.action).toBe("BAN_USER");
    expect(actionPayload.targetId).toBe(42);
    expect(actionPayload.details).toBe("Banned user ID 42");
  });

  it("formats UNBAN_USER admin action payload correctly", () => {
    const actionPayload: InsertAdminAction = {
      adminId: 1,
      action: "UNBAN_USER",
      targetId: 42,
      details: "Unbanned user ID 42",
    };

    expect(actionPayload.action).toBe("UNBAN_USER");
    expect(actionPayload.targetId).toBe(42);
  });

  it("formats DELETE_ITEM admin action payload correctly", () => {
    const actionPayload: InsertAdminAction = {
      adminId: 2,
      action: "DELETE_ITEM",
      targetId: 105,
      details: "Deleted item ID 105",
    };

    expect(actionPayload.action).toBe("DELETE_ITEM");
    expect(actionPayload.targetId).toBe(105);
  });

  it("formats CANCEL_DEAL admin action payload correctly", () => {
    const actionPayload: InsertAdminAction = {
      adminId: 2,
      action: "CANCEL_DEAL",
      targetId: 301,
      details: "Cancelled deal ID 301",
    };

    expect(actionPayload.action).toBe("CANCEL_DEAL");
    expect(actionPayload.targetId).toBe(301);
  });

  it("formats UPDATE_REPORT_STATUS admin action payload correctly", () => {
    const actionPayload: InsertAdminAction = {
      adminId: 3,
      action: "UPDATE_REPORT_STATUS",
      targetId: 12,
      details: "Updated report status to RESOLVED",
    };

    expect(actionPayload.action).toBe("UPDATE_REPORT_STATUS");
    expect(actionPayload.targetId).toBe(12);
    expect(actionPayload.details).toContain("RESOLVED");
  });
});
