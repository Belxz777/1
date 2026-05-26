import { describe, it, expect, afterAll } from "bun:test";
import { ClientModel } from "../models/client";

const ID = crypto.randomUUID();

describe("ClientModel", () => {

  it("create", async () => {
    const c = await ClientModel.create({
      id: ID, inboundId: 1, email: "test@x.com"
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

  afterAll(() => ClientModel.delete(ID));
});