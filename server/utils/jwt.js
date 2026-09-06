import { createHmac, timingSafeEqual } from "node:crypto";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signature(input, secret) {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

export function signToken(user, expiresInSeconds = 7 * 24 * 60 * 60) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ sub: user._id.toString(), email: user.email, name: user.name, iat: now, exp: now + expiresInSeconds });
  const input = `${header}.${payload}`;
  return `${input}.${signature(input, secret)}`;
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw Object.assign(new Error("Invalid token"), { name: "JsonWebTokenError" });
  const input = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(signature(input, secret));
  const actual = Buffer.from(parts[2]);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Object.assign(new Error("Invalid token signature"), { name: "JsonWebTokenError" });
  let payload;
  try { payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")); }
  catch { throw Object.assign(new Error("Invalid token payload"), { name: "JsonWebTokenError" }); }
  if (!payload.sub) throw Object.assign(new Error("Invalid token subject"), { name: "JsonWebTokenError" });
  if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) throw Object.assign(new Error("Token expired"), { name: "TokenExpiredError" });
  return payload;
}
