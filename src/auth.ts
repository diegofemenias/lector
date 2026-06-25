import type { Env, SessionUser } from "./types";

const SESSION_COOKIE = "lector_session";
const SESSION_DAYS = 30;

function base64url(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64url(sig);
}

async function verify(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(data, secret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

type SessionPayload =
  | { userId: string; exp: number }
  | { googleId: string; email: string; exp: number; pending: true };

export async function createSessionToken(userId: string, secret: string): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ userId, exp });
  const payloadB64 = base64url(new TextEncoder().encode(payload));
  const sig = await sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export async function createPendingSessionToken(
  googleId: string,
  email: string,
  secret: string
): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ googleId, email, exp, pending: true });
  const payloadB64 = base64url(new TextEncoder().encode(payload));
  const sig = await sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export async function parseSessionPayload(
  token: string | undefined,
  secret: string
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const valid = await verify(payloadB64, sig, secret);
  if (!valid) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64))) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    if ("pending" in payload && payload.pending) {
      if (!payload.googleId || !payload.email) return null;
      return payload;
    }
    if (!("userId" in payload) || !payload.userId) return null;
    return payload;
  } catch {
    return null;
  }
}

/** @deprecated Usar parseSessionPayload */
export async function parseSessionToken(
  token: string | undefined,
  secret: string
): Promise<string | null> {
  const payload = await parseSessionPayload(token, secret);
  if (!payload || "pending" in payload) return null;
  return payload.userId;
}

export function sessionCookieHeader(token: string, maxAge: number): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getSessionFromRequest(request: Request): string | undefined {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match?.[1];
}

export function googleAuthUrl(env: Env, origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${origin}/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(
  code: string,
  env: Env,
  origin: string
): Promise<{ googleId: string; email: string; name: string }> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${origin}/auth/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error("Error al obtener token de Google");
  const tokens = (await tokenRes.json()) as { access_token: string };
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) throw new Error("Error al obtener perfil de Google");
  const profile = (await userRes.json()) as { id: string; email: string; name: string };
  return { googleId: profile.id, email: profile.email, name: profile.name };
}

export async function getSessionUser(
  request: Request,
  env: Env
): Promise<SessionUser | null> {
  const token = getSessionFromRequest(request);
  const payload = await parseSessionPayload(token, env.SESSION_SECRET);
  if (!payload) return null;

  if ("pending" in payload && payload.pending) {
    const row = await env.DB.prepare(
      "SELECT id, email, display_name, is_admin FROM users WHERE google_id = ?"
    )
      .bind(payload.googleId)
      .first<{ id: string; email: string; display_name: string | null; is_admin: number }>();

    if (row) {
      return {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        isAdmin: row.is_admin === 1,
      };
    }

    return {
      id: "",
      email: payload.email,
      displayName: null,
      isAdmin: false,
      pending: true,
      googleId: payload.googleId,
    };
  }

  const row = await env.DB.prepare(
    "SELECT id, email, display_name, is_admin FROM users WHERE id = ?"
  )
    .bind(payload.userId)
    .first<{ id: string; email: string; display_name: string | null; is_admin: number }>();
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    isAdmin: row.is_admin === 1,
  };
}

export function randomState(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(16)));
}

export function stateCookieHeader(state: string): string {
  return `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export function getOAuthState(request: Request): string | undefined {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/oauth_state=([^;]+)/);
  return match?.[1];
}

export function clearStateCookie(): string {
  return "oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
