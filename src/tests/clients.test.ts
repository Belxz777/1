import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { ClientModel } from "../models/client";
import { InboundModel } from "../models/inbound";

const ID = crypto.randomUUID();
let inboundId: number;

describe("ClientModel", () => {

  beforeAll(async () => {
    const inbound = await InboundModel.create({
      tag: "test-inbound",
      protocol: "vless",
      port: 10443,
    });
    inboundId = inbound.id;
  });

  it("create", async () => {
    const c = await ClientModel.create({
      id: ID, inboundId, email: "test@x.com"
    });
    expect(c.id).toBe(ID);
    expect(c.enabled).toBe(true);
  });

  it("getById", async () => {
    const c = await ClientModel.getById(ID);
    expect(c?.email).toBe("test@x.com");
  });

  it("isExpired → false при expiryTime = 0", async () => {
    const c = await ClientModel.getById(ID);
    expect(ClientModel.isExpired(c!)).toBe(false);
  });

  afterAll(async () => {
    await ClientModel.delete(ID);
    await InboundModel.delete(inboundId);
  });
});