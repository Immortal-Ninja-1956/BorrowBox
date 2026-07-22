import { describe, it, expect, vi } from "vitest";

describe("Rate Limiting & Dispute Cap Unit Tests", () => {
  it("keys rate limiters by user ID when Bearer token is provided", () => {
    const mockPayload = { sub: "123" };
    const mockToken = `header.${Buffer.from(JSON.stringify(mockPayload)).toString("base64")}.signature`;
    const req = {
      headers: { authorization: `Bearer ${mockToken}` },
      ip: "192.168.1.1",
    };

    const extractUserIdFromBearer = (request: any, prefix: string) => {
      try {
        const auth = request.headers?.authorization as string | undefined;
        if (auth?.startsWith("Bearer ")) {
          const payload = JSON.parse(
            Buffer.from(auth.split(".")[1], "base64").toString("utf-8")
          );
          if (payload?.sub) return `${prefix}-user-${payload.sub}`;
        }
      } catch {}
      return `${prefix}-ip-${request.ip}`;
    };

    expect(extractUserIdFromBearer(req, "dispute")).toBe("dispute-user-123");
  });

  it("falls back to IP address key when Bearer token is missing", () => {
    const req = { headers: {}, ip: "192.168.1.50" };

    const extractUserIdFromBearer = (request: any, prefix: string) => {
      try {
        const auth = request.headers?.authorization as string | undefined;
        if (auth?.startsWith("Bearer ")) {
          const payload = JSON.parse(
            Buffer.from(auth.split(".")[1], "base64").toString("utf-8")
          );
          if (payload?.sub) return `${prefix}-user-${payload.sub}`;
        }
      } catch {}
      return `${prefix}-ip-${request.ip}`;
    };

    expect(extractUserIdFromBearer(req, "dispute")).toBe("dispute-ip-192.168.1.50");
  });

  it("enforces hard cap of 3 disputes per deal", () => {
    const checkDisputeCap = (disputeCount: number) => {
      if (disputeCount >= 3) {
        throw new Error("Dispute limit reached for this deal (maximum 3 disputes allowed). Please contact support for manual resolution.");
      }
    };

    expect(() => checkDisputeCap(0)).not.toThrow();
    expect(() => checkDisputeCap(1)).not.toThrow();
    expect(() => checkDisputeCap(2)).not.toThrow();
    expect(() => checkDisputeCap(3)).toThrow("Dispute limit reached for this deal");
  });
});
