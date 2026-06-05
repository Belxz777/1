import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { join } from "path";
import { env } from "../../config";
import * as protobuf from "protobufjs";

const PROTO_DIR = join(import.meta.dir, "../../../proto");

let handlerPkg: any = null;

function getHandlerPkg() {
  if (handlerPkg) return handlerPkg;

  const pkgDef = protoLoader.loadSync(join(PROTO_DIR, "inbound.proto"), {
    keepCase: true,
    longs: Number,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  });

  const proto = grpc.loadPackageDefinition(pkgDef) as any;
  const creds = grpc.credentials.createInsecure();

  handlerPkg = {
    grpcClient: new proto.xray.app.proxyman.command.HandlerService(env.xray.apiAddress, creds),
    types: proto.xray,
  };
  return handlerPkg;
}

/** Тип URL для аккаунта в зависимости от протокола */
function accountTypeUrl(protocol: string): string {
  const m: Record<string, string> = {
    vless: "xray.proxy.vless.Account",
    vmess: "xray.proxy.vmess.Account",
    trojan: "xray.proxy.trojan.Account",
    shadowsocks: "xray.proxy.shadowsocks.Account",
  };
  return m[protocol] || `xray.proxy.${protocol}.Account`;
}

/** protobufjs-тип для Account (минимальный: id + password) */
function makeAccountMessage(id: string, protocol: string): protobuf.Message {
  const root = new protobuf.Root();

  if (protocol === "trojan") {
    const type = new protobuf.Type("Account")
      .add(new protobuf.Field("password", 2, "string"));
    return type.create({ password: id });
  }

  // vless / vmess
  const type = new protobuf.Type("Account")
    .add(new protobuf.Field("id", 1, "string"))
    .add(new protobuf.Field("flow", 2, "int32"))
    .add(new protobuf.Field("encryption", 3, "string"));
  return type.create({ id });
}

function encodeMessage(type: protobuf.Type, msg: object): Buffer {
  return Buffer.from(type.encode(type.create(msg)).finish());
}

export async function addUserToInbound(
  tag: string,
  email: string,
  level: number,
  protocol: string,
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const pkg = getHandlerPkg();
    const client = pkg.grpcClient;

    // TypedMessage для account
    const accountMsg = makeAccountMessage(id, protocol);
    const accountBytes = Buffer.from(
      (accountMsg.$type as protobuf.Type).encode(accountMsg).finish()
    );

    // Account wrapped in TypedMessage
    const typedMsgType = new protobuf.Type("xray.common.serial.TypedMessage")
      .add(new protobuf.Field("type", 1, "string"))
      .add(new protobuf.Field("value", 2, "bytes"));
    const accountTypedMsg = typedMsgType.create({
      type: accountTypeUrl(protocol),
      value: accountBytes,
    });
    const accountTypedBytes = Buffer.from(typedMsgType.encode(accountTypedMsg).finish());

    // User message
    const userType = new protobuf.Type("xray.common.protocol.User")
      .add(new protobuf.Field("level", 1, "uint32"))
      .add(new protobuf.Field("email", 2, "string"))
      .add(new protobuf.Field("account", 3, "bytes"));
    const userBytes = encodeMessage(userType, {
      level,
      email,
      account: accountTypedBytes,
    });

    // AddUserOperation
    const addOpType = new protobuf.Type("xray.app.proxyman.command.AddUserOperation")
      .add(new protobuf.Field("user", 1, "bytes"));
    const addOpBytes = encodeMessage(addOpType, { user: userBytes });

    return new Promise((resolve) => {
      client.AlterInbound(
        {
          tag,
          operation: {
            type: "xray.app.proxyman.command.AddUserOperation",
            value: addOpBytes,
          },
        },
        (err: any) => {
          if (err) resolve({ success: false, error: err.message || String(err) });
          else resolve({ success: true });
        }
      );
    });
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

export async function removeUserFromInbound(
  tag: string,
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const pkg = getHandlerPkg();
    const client = pkg.grpcClient;

    // RemoveUserOperation — просто email
    const type = new protobuf.Type("xray.app.proxyman.command.RemoveUserOperation")
      .add(new protobuf.Field("email", 1, "string"));
    const removeBytes = encodeMessage(type, { email });

    return new Promise((resolve) => {
      client.AlterInbound(
        {
          tag,
          operation: {
            type: "xray.app.proxyman.command.RemoveUserOperation",
            value: removeBytes,
          },
        },
        (err: any) => {
          if (err) resolve({ success: false, error: err.message || String(err) });
          else resolve({ success: true });
        }
      );
    });
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

export async function listInbounds(): Promise<{ success: boolean; inbounds?: any[]; error?: string }> {
  try {
    const pkg = getHandlerPkg();
    const client = pkg.grpcClient;

    return new Promise((resolve) => {
      client.ListInbounds({ isOnlyTags: false }, (err: any, res: any) => {
        if (err) resolve({ success: false, error: err.message || String(err) });
        else resolve({ success: true, inbounds: res?.inbounds ?? [] });
      });
    });
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}
