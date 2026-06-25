import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
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
  deleteIncompleteUser,
  getAdminStats,
  getRandomStory,
  getStoryById,
  getRanking,
  getUserStats,
  setDisplayName,
  submitAnswers,
  verifyAdmin,
  listAdminUsers,
  adminSetUserDisplayName,
  adminDeleteUser,
} from "./db";
import { touchDataSync } from "./seed";

const app = new Hono<{ Bindings: Env }>();

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
    const maxAge = 30 * 24 * 60 * 60;
    const token = existing
      ? await createSessionToken(existing.id, c.env.SESSION_SECRET)
      : await createPendingSessionToken(profile.googleId, profile.email, c.env.SESSION_SECRET);
    const headers = new Headers({ Location: "/" });
    headers.append("Set-Cookie", sessionCookieHeader(token, maxAge));
    headers.append("Set-Cookie", clearStateCookie());
    return new Response(null, { status: 302, headers });
  } catch {
    return c.redirect("/?error=auth");
  }
});

app.post("/auth/logout", async (c) => {
  const user = await getSessionUser(c.req.raw, c.env);
  if (user?.id && !user.pending && !user.displayName) {
    await deleteIncompleteUser(c.env.DB, user.id);
  }
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
});

app.get("/api/me", async (c) => {
  const user = await getSessionUser(c.req.raw, c.env);
  if (!user) return json({ authenticated: false }, 200);
  if (user.pending) {
    return json({
      authenticated: true,
      user: {
        email: user.email,
        displayName: null,
        isAdmin: false,
        points: 0,
        storiesRead: 0,
        totalStories: 0,
        unreadStories: 0,
      },
    });
  }
  const stats = await getUserStats(c.env.DB, user.id);
  return json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      points: stats.points,
      storiesRead: stats.storiesRead,
      totalStories: stats.totalStories,
      unreadStories: stats.unreadStories,
    },
  });
});

app.post("/api/profile", async (c) => {
  const user = await getSessionUser(c.req.raw, c.env);
  if (!user) return json({ error: "No autenticado" }, 401);
  const body = (await c.req.json()) as { displayName?: string };
  if (!body.displayName) return json({ error: "Nombre requerido" }, 400);
  try {
    let userId = user.id;
    const maxAge = 30 * 24 * 60 * 60;
    const headers: Record<string, string> = {};

    if (user.pending) {
      if (!user.googleId) return json({ error: "Sesión inválida" }, 401);
      userId = await findOrCreateUser(c.env.DB, user.googleId, user.email);
      await setDisplayName(c.env.DB, userId, body.displayName);
      const token = await createSessionToken(userId, c.env.SESSION_SECRET);
      headers["Set-Cookie"] = sessionCookieHeader(token, maxAge);
    } else {
      await setDisplayName(c.env.DB, userId, body.displayName);
    }

    const displayName = body.displayName.trim().slice(0, 40);
    return json({ ok: true, displayName }, 200, headers);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error" }, 400);
  }
});

app.get("/api/story/random", async (c) => {
  const user = await getSessionUser(c.req.raw, c.env);
  if (!user) return json({ error: "No autenticado" }, 401);
  if (!user.displayName) return json({ error: "Nombre requerido" }, 403);
  const story = await getRandomStory(c.env.DB, user.id);
  if (!story) return json({ error: "No hay cuentos disponibles" }, 404);
  return json({
    story: story.story,
    isRepeat: story.isRepeat,
    unreadRemaining: story.unreadRemaining,
  });
});

app.get("/api/story/:id", async (c) => {
  const user = await getSessionUser(c.req.raw, c.env);
  if (!user) return json({ error: "No autenticado" }, 401);
  if (!user.displayName) return json({ error: "Nombre requerido" }, 403);
  const storyId = Number(c.req.param("id"));
  if (!Number.isInteger(storyId) || storyId < 1) return json({ error: "Cuento inválido" }, 400);
  const story = await getStoryById(c.env.DB, storyId);
  if (!story) return json({ error: "Cuento no encontrado" }, 404);
  return json({ story });
});

app.post("/api/story/:id/submit", async (c) => {
  const user = await getSessionUser(c.req.raw, c.env);
  if (!user) return json({ error: "No autenticado" }, 401);
  if (!user.displayName || user.pending) return json({ error: "Nombre requerido" }, 403);
  const storyId = Number(c.req.param("id"));
  if (!Number.isInteger(storyId)) return json({ error: "Cuento inválido" }, 400);
  const body = (await c.req.json()) as { answers?: Record<string, string> };
  if (!body.answers) return json({ error: "Respuestas requeridas" }, 400);
  const answers: Record<number, string> = {};
  for (const [k, v] of Object.entries(body.answers)) {
    answers[Number(k)] = v;
  }
  try {
    const result = await submitAnswers(c.env.DB, user.id, storyId, answers);
    const stats = await getUserStats(c.env.DB, user.id);
    return json({ ...result, totalPoints: stats.points, storiesRead: stats.storiesRead, unreadStories: stats.unreadStories, totalStories: stats.totalStories });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error" }, 400);
  }
});

app.get("/api/ranking", async (c) => {
  const ranking = await getRanking(c.env.DB);
  return json({ ranking });
});

app.post("/api/admin/login", async (c) => {
  const user = await getSessionUser(c.req.raw, c.env);
  if (!user) return json({ error: "No autenticado" }, 401);
  const body = (await c.req.json()) as { password?: string };
  if (!body.password) return json({ error: "Contraseña requerida" }, 400);
  const ok = await verifyAdmin(c.env.DB, user, body.password, c.env.ADMIN_PASSWORD);
  if (!ok) return json({ error: "Contraseña incorrecta" }, 403);
  return json({ ok: true });
});

app.get("/api/admin/stats", async (c) => {
  const user = await getSessionUser(c.req.raw, c.env);
  if (!user?.isAdmin) return json({ error: "No autorizado" }, 403);
  const stats = await getAdminStats(c.env.DB);
  return json(stats);
});

app.get("/api/admin/users", async (c) => {
  const user = await getSessionUser(c.req.raw, c.env);
  if (!user?.isAdmin) return json({ error: "No autorizado" }, 403);
  const users = await listAdminUsers(c.env.DB);
  return json({ users });
});

app.patch("/api/admin/users/:id", async (c) => {
  const user = await getSessionUser(c.req.raw, c.env);
  if (!user?.isAdmin) return json({ error: "No autorizado" }, 403);
  const userId = c.req.param("id");
  const body = (await c.req.json()) as { displayName?: string };
  if (!body.displayName?.trim()) return json({ error: "Nombre requerido" }, 400);
  try {
    const displayName = await adminSetUserDisplayName(c.env.DB, userId, body.displayName);
    return json({ ok: true, displayName });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error" }, 400);
  }
});

app.delete("/api/admin/users/:id", async (c) => {
  const user = await getSessionUser(c.req.raw, c.env);
  if (!user?.isAdmin) return json({ error: "No autorizado" }, 403);
  const userId = c.req.param("id");
  if (userId === user.id) {
    return json({ error: "No podés eliminar tu propia cuenta de admin" }, 400);
  }
  try {
    await adminDeleteUser(c.env.DB, userId);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error" }, 400);
  }
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
