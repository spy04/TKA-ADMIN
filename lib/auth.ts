import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestCookies, ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { cookies } from "next/headers";

type AuthConfig = {
  cookieName: string;
  password: string;
  secret: string;
  username: string;
};

type SessionPayload = {
  exp: number;
  username: string;
};

export const loginSchema = {
  safeParse(input: { password: string; username: string }) {
    const username = input.username.trim();
    const password = input.password.trim();

    if (!username || !password) {
      return {
        success: false as const,
      };
    }

    return {
      success: true as const,
      data: { username, password },
    };
  },
};

function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Environment variable ${name} belum diisi.`);
  }

  return value;
}

export function hasAuthConfig() {
  return Boolean(
    process.env.ADMIN_USERNAME &&
      process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_SESSION_SECRET,
  );
}

export function getAuthConfig(): AuthConfig {
  return {
    cookieName: "tka_admin_session",
    username: getEnv("ADMIN_USERNAME"),
    password: getEnv("ADMIN_PASSWORD"),
    secret: getEnv("ADMIN_SESSION_SECRET"),
  };
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(value: string): SessionPayload | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(decoded) as SessionPayload;
  } catch {
    return null;
  }
}

function createSignature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function createAdminSessionValue(username: string, secret: string) {
  const payload = encodePayload({
    username,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  });

  const signature = createSignature(payload, secret);
  return `${payload}.${signature}`;
}

function readSessionValue(cookieValue: string | undefined, secret: string) {
  if (!cookieValue) {
    return null;
  }

  const [payload, signature] = cookieValue.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = createSignature(payload, secret);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  const decoded = decodePayload(payload);

  if (!decoded || decoded.exp < Date.now()) {
    return null;
  }

  return decoded;
}

export async function isAdminAuthenticated() {
  if (!hasAuthConfig()) {
    return false;
  }

  const auth = getAuthConfig();
  const cookieStore = await cookies();
  const session = readSessionValue(cookieStore.get(auth.cookieName)?.value, auth.secret);
  return session?.username === auth.username;
}

export function isAdminAuthenticatedInRequest(requestCookies: RequestCookies) {
  if (!hasAuthConfig()) {
    return false;
  }

  const auth = getAuthConfig();
  const session = readSessionValue(requestCookies.get(auth.cookieName)?.value, auth.secret);
  return session?.username === auth.username;
}

export function clearAdminSession(cookieStore: RequestCookies | ResponseCookies, cookieName: string) {
  cookieStore.set({
    name: cookieName,
    value: "",
    path: "/",
    httpOnly: true,
    maxAge: 0,
  });
}
