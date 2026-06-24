const app = document.getElementById("app");
const nav = document.getElementById("nav");
const navToggle = document.getElementById("nav-toggle");

import {
  enrichText,
  setVocabulary,
  bindVocabularyClicks,
} from "./vocabulary.js";

bindVocabularyClicks(app);

let state = {
  user: null,
  story: null,
  storyMeta: null,
  answers: {},
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Algo salió mal");
  return data;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hasDisplayName() {
  return Boolean(state.user?.displayName);
}

function closeMobileNav() {
  nav.classList.remove("nav-open");
  navToggle.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Abrir menú");
}

function openMobileNav() {
  nav.classList.add("nav-open");
  navToggle.classList.add("is-open");
  navToggle.setAttribute("aria-expanded", "true");
  navToggle.setAttribute("aria-label", "Cerrar menú");
}

function toggleMobileNav() {
  if (nav.classList.contains("nav-open")) closeMobileNav();
  else openMobileNav();
}

function renderNav() {
  if (!state.user || !hasDisplayName()) {
    nav.classList.add("hidden");
    nav.classList.remove("nav-open");
    nav.innerHTML = "";
    navToggle.classList.add("hidden");
    navToggle.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    return;
  }
  nav.classList.remove("hidden");
  navToggle.classList.remove("hidden");
  nav.innerHTML = `
    <span class="user-chip">${escapeHtml(state.user.displayName)} · ${state.user.points} pts</span>
    <button class="btn btn-small btn-ghost" data-action="home">Inicio</button>
    <button class="btn btn-small btn-ghost" data-action="ranking">Ranking</button>
    <button class="btn btn-small btn-ghost" data-action="change-name">Cambiar nombre</button>
    <button class="btn btn-small btn-ghost" data-action="logout">Salir</button>
  `;
  closeMobileNav();
}

function renderLogin(error) {
  app.innerHTML = `
    <section class="card stack login-card">
      ${error ? `<div class="error-banner">${escapeHtml(error)}</div>` : ""}
      <h1 class="hero-title hero-title-landing">¡A leer se ha dicho!</h1>
      <div class="login-actions">
        <a class="btn btn-google btn-google-hero" href="/auth/google">🔐 Entrar con Google</a>
      </div>
      <p class="login-promo-text">
        <span class="promo-word promo-read">Lee cuentos cortos</span>,
        <span class="promo-word promo-quiz">responde preguntas</span> y
        <span class="promo-word promo-rank">subí en el ranking</span>.
      </p>
    </section>
  `;
}

function renderNamePicker({ editing = false } = {}) {
  const currentName = editing ? state.user?.displayName || "" : "";
  app.innerHTML = `
    <section class="card stack">
      <h2>${editing ? "Cambiar tu nombre" : "¿Cómo te llamamos?"}</h2>
      <p class="subtitle">${
        editing
          ? "Elegí un nombre nuevo. Así aparecerás en el ranking."
          : "Podés usar tu nombre o un apodo gracioso. Primero preguntale a mamá o papá.<br><br>Con ese nombre aparecerás en el ranking."
      }</p>
      <form id="name-form" class="stack">
        <input
          class="input"
          name="displayName"
          maxlength="40"
          placeholder="Ej: Capitán Libro, La Cabra Astronauta, La Zurda Mágica..."
          value="${escapeHtml(currentName)}"
          required
        />
        <div class="row name-form-actions">
          <button class="btn btn-primary" type="submit">${editing ? "Guardar nombre" : "¡Listo, a leer!. Convertite en el GOAT."}</button>
          ${editing ? `<button class="btn btn-ghost" type="button" data-action="home">Cancelar</button>` : ""}
        </div>
      </form>
      ${
        !editing
          ? `<button class="btn-text-link" type="button" data-action="logout">Salir y usar otra cuenta</button>`
          : ""
      }
    </section>
  `;
  document.getElementById("name-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const displayName = fd.get("displayName");
    try {
      const result = await api("/api/profile", { method: "POST", body: JSON.stringify({ displayName }) });
      state.user.displayName = result.displayName;
      renderNav();
      renderHome();
    } catch (err) {
      alert(err.message);
    }
  });
}

function renderHome() {
  const unread = state.user.unreadStories ?? 0;
  const allRead = unread === 0 && (state.user.totalStories ?? 0) > 0;
  const progressText = allRead
    ? "¡Leíste todos los cuentos! Ahora podés volver a leer alguno al azar."
    : unread > 0
      ? `Te quedan <strong>${unread}</strong> cuento${unread === 1 ? "" : "s"} nuevo${unread === 1 ? "" : "s"} por leer.`
      : "Te toca un cuento al azar. Léelo con calma y responde las 3 preguntas.";

  app.innerHTML = `
    <section class="card stack">
      <div class="row" style="justify-content:space-between">
        <h2>Hola, ${escapeHtml(state.user.displayName)} 👋</h2>
        <span class="badge">${state.user.points} puntos · ${state.user.storiesRead} cuentos</span>
      </div>
      <p class="subtitle">${progressText}</p>
      <div class="points-breakdown">
        <span class="chip">+1 leer</span>
        <span class="chip">+1 por acierto</span>
        <span class="chip">+1 bonus si las 3 son correctas</span>
      </div>
      <button class="btn btn-primary" data-action="new-story">📖 Dame un cuento</button>
      <button class="btn btn-ghost" data-action="ranking">🏆 ¡Mirá el ranking!</button>
    </section>
  `;
}

function renderStory() {
  const s = state.story;
  const vocab = s.vocabulary || null;
  setVocabulary(vocab);
  const vocabHint = vocab && Object.keys(vocab).length
    ? `<p class="vocab-hint">💡 Las palabras <span class="word-help-sample">subrayadas en color</span> son más difíciles. Tocalas para ver qué significan.</p>`
    : "";
  const repeatHint = state.storyMeta?.isRepeat
    ? `<p class="vocab-hint" style="background:#fffbeb;border-color:#fcd34d;color:#b45309">📚 Ya leíste todos los cuentos nuevos. Este es un repaso al azar.</p>`
    : state.storyMeta?.unreadRemaining
      ? `<p class="subtitle" style="margin:0 0 0.5rem">Cuentos nuevos que te faltan: <strong>${state.storyMeta.unreadRemaining}</strong></p>`
      : "";

  app.innerHTML = `
    <section class="card stack">
      <h2 class="story-title">${enrichText(s.title, vocab)}</h2>
      ${repeatHint}
      ${vocabHint}
      ${s.paragraphs.map((p) => `<p class="paragraph">${enrichText(p, vocab)}</p>`).join("")}
      <hr style="border:none;border-top:2px dashed #e9d5ff;margin:0.5rem 0" />
      <h3>Preguntas de comprensión</h3>
      <form id="quiz-form" class="stack">
        ${s.questions
          .map(
            (q, i) => `
          <fieldset class="question-block">
            <legend>${i + 1}. ${enrichText(q.question, vocab)}</legend>
            ${["a", "b", "c", "d"]
              .map(
                (key) => `
              <label class="option">
                <input type="radio" name="q_${q.id}" value="${key}" required />
                <span>${enrichText(q.options[key], vocab)}</span>
              </label>`
              )
              .join("")}
          </fieldset>`
          )
          .join("")}
        <button class="btn btn-accent" type="submit">Enviar respuestas</button>
      </form>
    </section>
  `;

  document.getElementById("quiz-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const answers = {};
    for (const q of s.questions) {
      answers[q.id] = fd.get(`q_${q.id}`);
    }
    try {
      const result = await api(`/api/story/${s.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      state.user.points = result.totalPoints;
      state.user.storiesRead = result.storiesRead;
      if (result.unreadStories != null) {
        state.user.unreadStories = result.unreadStories;
        state.user.totalStories = result.totalStories;
      }
      renderNav();
      renderResult(result);
    } catch (err) {
      alert(err.message);
    }
  });
}

function renderResult(result) {
  const perfect = result.correctCount === result.totalQuestions;
  const scoreMessage = result.keptBestScore
    ? `<p>Obtuviste <strong>+${result.points} puntos</strong> en este intento, pero conservaste tu mejor marca de <strong>${result.pointsRecorded} puntos</strong> en este cuento.</p>`
    : `<p><strong>+${result.pointsAdded > 0 ? result.pointsAdded : result.points} puntos</strong> ${result.pointsAdded > 0 && result.pointsAdded !== result.points ? `sumados (marca del cuento: ${result.pointsRecorded})` : "en este cuento"}</p>`;

  app.innerHTML = `
    <section class="card stack result-box">
      <h2>${perfect ? "¡Increíble! 🌟" : result.keptBestScore ? "¡Seguí intentando! 💪" : "¡Buen trabajo! 📚"}</h2>
      <p>Acertaste ${result.correctCount} de ${result.totalQuestions} preguntas.</p>
      ${scoreMessage}
      <div class="points-breakdown">
        <span class="chip">Leer: ${result.breakdown.read}</span>
        <span class="chip">Aciertos: ${result.breakdown.correct}</span>
        <span class="chip">Bonus: ${result.breakdown.bonus}</span>
      </div>
      <p>Total acumulado: <strong>${state.user.points} puntos</strong></p>
      <div class="row" style="justify-content:center">
        <button class="btn btn-primary" data-action="new-story">Otro cuento</button>
        <button class="btn btn-ghost" data-action="ranking">Ver ranking</button>
        <button class="btn btn-ghost" data-action="home">Inicio</button>
      </div>
    </section>
  `;
}

function renderRanking(ranking) {
  app.innerHTML = `
    <section class="card stack">
      <h2>🏆 Ranking de lectores</h2>
      <p class="subtitle">¿Quién ira ganando?. ¡Seguí sumando puntos!</p>
      <ul class="ranking-list">
        ${
          ranking.length
            ? ranking
                .map(
                  (r) => `
            <li class="ranking-item ${state.user?.displayName === r.displayName ? "me" : ""}">
              <div class="row ranking-name">
                <span class="rank-num">#${r.rank}</span>
                <strong>${escapeHtml(r.displayName)}</strong>
              </div>
              <div class="ranking-scores">
                <span class="points-today-pill">+${r.pointsToday} hoy</span>
                <span class="points-total-pill">${r.pointsTotal}</span>
              </div>
            </li>`
                )
                .join("")
            : "<li class='subtitle'>Todavía no hay lectores en el ranking.</li>"
        }
      </ul>
      <button class="btn btn-ghost" data-action="home">Volver al inicio</button>
    </section>
  `;
}

async function loadRanking() {
  const data = await api("/api/ranking");
  renderRanking(data.ranking);
}

async function loadStory() {
  const data = await api("/api/story/random");
  state.story = data.story;
  state.storyMeta = { isRepeat: data.isRepeat, unreadRemaining: data.unreadRemaining };
  renderStory();
}

async function bootstrap() {
  const params = new URLSearchParams(location.search);
  const authError = params.get("error") === "auth" ? "No pudimos completar el ingreso con Google. Intentá de nuevo." : null;
  if (authError) history.replaceState({}, "", "/");

  const data = await api("/api/me");
  if (!data.authenticated) {
    state.user = null;
    renderNav();
    renderLogin(authError);
    return;
  }

  state.user = data.user;

  if (!state.user.displayName) {
    renderNav();
    renderNamePicker();
    return;
  }

  renderNav();
  renderHome();
}

nav.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === "logout") {
    closeMobileNav();
    await api("/auth/logout", { method: "POST" });
    location.reload();
    return;
  }
  if (!hasDisplayName()) return;
  closeMobileNav();
  if (action === "home") renderHome();
  if (action === "ranking") await loadRanking();
  if (action === "change-name") renderNamePicker({ editing: true });
});

navToggle.addEventListener("click", () => {
  if (nav.classList.contains("hidden")) return;
  toggleMobileNav();
});

document.addEventListener("click", (e) => {
  if (nav.classList.contains("hidden") || !nav.classList.contains("nav-open")) return;
  if (e.target.closest(".header")) return;
  closeMobileNav();
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 768) closeMobileNav();
});

app.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  try {
    if (action === "logout") {
      await api("/auth/logout", { method: "POST" });
      location.reload();
      return;
    }
    if (action === "change-name") {
      if (!state.user) return;
      renderNamePicker({ editing: true });
      return;
    }
    if (!hasDisplayName()) {
      renderNamePicker();
      return;
    }
    if (action === "new-story") await loadStory();
    if (action === "ranking") await loadRanking();
    if (action === "home") renderHome();
  } catch (err) {
    alert(err.message);
  }
});

bootstrap();
