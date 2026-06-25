import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, ReaderLevel } from "./types";
import {
  clearSessionCookie,
  clearStateCookie,
  createSessionToken,
  createPendingSessionToken,
  exchangeGoogleCode,
  getOAuthState,
  getSessionUser,
  googleAuthUrl,
  randomState,
  sessionCookieHeader,
  stateCookieHeader,
} from "./auth";
import {
  findOrCreateUser,
  findUserByGoogleId,
  deleteIncompleteAccount,
  getAdminStats,
  getRandomStory,
  getStoryById,
  getRanking,
  submitAnswers,
  verifyAdmin,
  getReaderStatsAfterSubmit,
} from "./db";
import {
  createReader,
  getReaderById,
  listReadersForAccount,
  listAdminReaders,
  adminSetReaderDisplayName,
  adminSetReaderLevel,
  adminDeleteReader,
  setReaderLevel,
  MAX_READERS_PER_ACCOUNT,
} from "./readers";
import { touchDataSync } from "./seed";

const app = new Hono<{ Bindings: Env }>();
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

app.use("/api/*", cors({ origin: "*", credentials: true }));

function originFromRequest(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function parseLevel(value: unknown): ReaderLevel | null {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

async function issueSession(
  accountId: string,
  secret: string,
  readerId?: string
): Promise<Record<string, string>> {
  const token = await createSessionToken(accountId, secret, readerId);
  return { "Set-Cookie": sessionCookieHeader(token, SESSION_MAX_AGE) };
}

function hasActiveReader(session: Awaited<ReturnType<typeof getSessionUser>>): boolean {
  return Boolean(session?.readerId && session.displayName);
}

app.get("/auth/google", (c) => {
  const state = randomState();
  const url = googleAuthUrl(c.env, originFromRequest(c.req.raw), state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Set-Cookie": stateCookieHeader(state),
    },
  });
});

app.get("/auth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const savedState = getOAuthState(c.req.raw);
  if (!code || !state || !savedState || state !== savedState) {
    return c.redirect("/?error=auth");
  }
  try {
    const profile = await exchangeGoogleCode(code, c.env, originFromRequest(c.req.raw));
    const existing = await findUserByGoogleId(c.env.DB, profile.googleId);
    const headers = new Headers({ Location: "/" });
    if (existing) {
      const token = await createSessionToken(existing.id, c.env.SESSION_SECRET);
      headers.append("Set-Cookie", sessionCookieHeader(token, SESSION_MAX_AGE));
    } else {
      const token = await createPendingSessionToken(
        profile.googleId,
        profile.email,
        c.env.SESSION_SECRET
      );
      headers.append("Set-Cookie", sessionCookieHeader(token, SESSION_MAX_AGE));
    }
    headers.append("Set-Cookie", clearStateCookie());
    return new Response(null, { status: 302, headers });
  } catch {
    return c.redirect("/?error=auth");
  }
});

app.post("/auth/logout", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (session?.accountId && !session.pending) {
    await deleteIncompleteAccount(c.env.DB, session.accountId);
  }
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
});

app.get("/api/me", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session) return json({ authenticated: false }, 200);

  if (session.pending) {
    return json({
      authenticated: true,
      account: { email: session.email, isAdmin: false },
      reader: null,
      readers: [],
      maxReaders: MAX_READERS_PER_ACCOUNT,
    });
  }

  const readers = await listReadersForAccount(c.env.DB, session.accountId);
  const activeReader = session.readerId
    ? readers.find((r) => r.id === session.readerId) ?? (await getReaderById(c.env.DB, session.readerId, session.accountId))
    : null;

  return json({
    authenticated: true,
    account: {
      id: session.accountId,
      email: session.email,
      isAdmin: session.isAdmin,
    },
    reader: activeReader,
    readers,
    maxReaders: MAX_READERS_PER_ACCOUNT,
  });
});

app.get("/api/readers", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session || session.pending) return json({ error: "No autenticado" }, 401);
  const readers = await listReadersForAccount(c.env.DB, session.accountId);
  return json({ readers, maxReaders: MAX_READERS_PER_ACCOUNT });
});

app.post("/api/readers", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session) return json({ error: "No autenticado" }, 401);

  const body = (await c.req.json()) as { displayName?: string; level?: number };
  const level = parseLevel(body.level ?? 1);
  if (!body.displayName?.trim()) return json({ error: "Nombre requerido" }, 400);
  if (!level) return json({ error: "Nivel inválido" }, 400);

  try {
    let accountId = session.accountId;
    const headers: Record<string, string> = {};

    if (session.pending) {
      if (!session.googleId) return json({ error: "Sesión inválida" }, 401);
      accountId = await findOrCreateUser(c.env.DB, session.googleId, session.email);
    }

    const reader = await createReader(c.env.DB, accountId, body.displayName, level);
    Object.assign(headers, await issueSession(accountId, c.env.SESSION_SECRET, reader.id));

    return json({ ok: true, reader }, 200, headers);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error" }, 400);
  }
});

app.post("/api/readers/:id/activate", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session || session.pending) return json({ error: "No autenticado" }, 401);

  const readerId = c.req.param("id");
  const reader = await getReaderById(c.env.DB, readerId, session.accountId);
  if (!reader) return json({ error: "Lector no encontrado" }, 404);

  const headers = await issueSession(session.accountId, c.env.SESSION_SECRET, reader.id);
  return json({ ok: true, reader }, 200, headers);
});

app.patch("/api/readers/:id/level", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session || session.pending) return json({ error: "No autenticado" }, 401);
  if (!hasActiveReader(session) || session.readerId !== c.req.param("id")) {
    return json({ error: "Activá este lector primero" }, 403);
  }

  const body = (await c.req.json()) as { level?: number };
  const level = parseLevel(body.level);
  if (!level) return json({ error: "Nivel inválido" }, 400);

  try {
    const reader = await setReaderLevel(c.env.DB, session.readerId!, session.accountId, level);
    return json({ ok: true, reader });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error" }, 400);
  }
});

app.get("/api/story/random", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session || session.pending) return json({ error: "No autenticado" }, 401);
  if (!hasActiveReader(session)) return json({ error: "Elegí un lector" }, 403);
  if (!session.readerId || !session.level) return json({ error: "Lector no encontrado" }, 404);

  const story = await getRandomStory(c.env.DB, session.readerId, session.level);
  if (!story) {
    return json(
      { error: session.level === 1 ? "No hay cuentos disponibles" : `Todavía no hay cuentos de nivel ${session.level}` },
      404
    );
  }
  return json({
    story: story.story,
    isRepeat: story.isRepeat,
    unreadRemaining: story.unreadRemaining,
    level: session.level,
  });
});

app.get("/api/story/:id", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session || session.pending) return json({ error: "No autenticado" }, 401);
  if (!hasActiveReader(session)) return json({ error: "Elegí un lector" }, 403);
  if (!session.level) return json({ error: "Lector no encontrado" }, 404);

  const storyId = Number(c.req.param("id"));
  if (!Number.isInteger(storyId) || storyId < 1) return json({ error: "Cuento inválido" }, 400);
  const story = await getStoryById(c.env.DB, storyId, session.level);
  if (!story) return json({ error: "Cuento no encontrado" }, 404);
  return json({ story, level: session.level });
});

app.post("/api/story/:id/submit", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session || session.pending) return json({ error: "No autenticado" }, 401);
  if (!hasActiveReader(session)) return json({ error: "Elegí un lector" }, 403);

  const storyId = Number(c.req.param("id"));
  if (!Number.isInteger(storyId)) return json({ error: "Cuento inválido" }, 400);
  const body = (await c.req.json()) as { answers?: Record<string, string> };
  if (!body.answers) return json({ error: "Respuestas requeridas" }, 400);

  const answers: Record<number, string> = {};
  for (const [k, v] of Object.entries(body.answers)) {
    answers[Number(k)] = v;
  }

  try {
    const result = await submitAnswers(c.env.DB, session.readerId!, storyId, answers);
    const stats = await getReaderStatsAfterSubmit(c.env.DB, session.readerId!, session.accountId);
    return json({
      ...result,
      totalPoints: stats.points,
      storiesRead: stats.storiesRead,
      unreadStories: stats.unreadStories,
      totalStories: stats.totalStories,
      level: stats.level,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error" }, 400);
  }
});

app.get("/api/ranking", async (c) => {
  const ranking = await getRanking(c.env.DB);
  return json({ ranking });
});

app.post("/api/admin/login", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session || session.pending) return json({ error: "No autenticado" }, 401);
  const body = (await c.req.json()) as { password?: string };
  if (!body.password) return json({ error: "Contraseña requerida" }, 400);
  const ok = await verifyAdmin(c.env.DB, session.accountId, body.password, c.env.ADMIN_PASSWORD);
  if (!ok) return json({ error: "Contraseña incorrecta" }, 403);
  return json({ ok: true });
});

app.get("/api/admin/stats", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session?.isAdmin) return json({ error: "No autorizado" }, 403);
  const stats = await getAdminStats(c.env.DB);
  return json(stats);
});

app.get("/api/admin/readers", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session?.isAdmin) return json({ error: "No autorizado" }, 403);
  const readers = await listAdminReaders(c.env.DB);
  return json({ readers });
});

app.patch("/api/admin/readers/:id", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session?.isAdmin) return json({ error: "No autorizado" }, 403);
  const readerId = c.req.param("id");
  const body = (await c.req.json()) as { displayName?: string; level?: number };
  try {
    let displayName: string | undefined;
    if (body.displayName?.trim()) {
      displayName = await adminSetReaderDisplayName(c.env.DB, readerId, body.displayName);
    }
    if (body.level != null) {
      const level = parseLevel(body.level);
      if (!level) return json({ error: "Nivel inválido" }, 400);
      await adminSetReaderLevel(c.env.DB, readerId, level);
    }
    return json({ ok: true, displayName });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error" }, 400);
  }
});

app.delete("/api/admin/readers/:id", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session?.isAdmin) return json({ error: "No autorizado" }, 403);
  const readerId = c.req.param("id");
  try {
    await adminDeleteReader(c.env.DB, readerId);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error" }, 400);
  }
});

/** @deprecated Usar /api/admin/readers */
app.get("/api/admin/users", async (c) => {
  const session = await getSessionUser(c.req.raw, c.env);
  if (!session?.isAdmin) return json({ error: "No autorizado" }, 403);
  const readers = await listAdminReaders(c.env.DB);
  return json({
    users: readers.map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.displayName,
      isAdmin: false,
      pointsTotal: r.pointsTotal,
      storiesRead: r.storiesRead,
      level: r.level,
    })),
  });
});

app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

function needsDataSync(pathname: string): boolean {
  return pathname.startsWith("/api/story/");
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (needsDataSync(new URL(request.url).pathname)) {
      await touchDataSync(env.DB);
    }
    return app.fetch(request, env, _ctx);
  },
};
