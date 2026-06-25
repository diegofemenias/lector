const app = document.getElementById("app");
const nav = document.getElementById("nav");
const navToggle = document.getElementById("nav-toggle");

import {
  enrichText,
  setVocabulary,
  bindVocabularyClicks,
} from "./vocabulary.js";

bindVocabularyClicks(app);

const LEVEL_LABELS = {
  1: "1° nivel",
  2: "2° nivel",
  3: "3° nivel",
};

let state = {
  account: null,
  reader: null,
  readers: [],
  maxReaders: 4,
  story: null,
  storyMeta: null,
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

function hasActiveReader() {
  return Boolean(state.reader?.id);
}

function closeMobileNav() {
  nav.classList.remove("nav-open");
  navToggle.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Abrir menú");
}

function levelSwitcherHtml() {
  if (!state.reader) return "";
  const lv = state.reader.level;
  return `
    <div class="level-switch" role="group" aria-label="Nivel de lectura">
      ${[1, 2, 3]
        .map(
          (n) =>
            `<button type="button" class="level-chip ${lv === n ? "active" : ""}" data-action="set-level" data-level="${n}">${n}°</button>`
        )
        .join("")}
    </div>`;
}

function renderNav() {
  if (!hasActiveReader()) {
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
    <span class="user-chip">${escapeHtml(state.reader.displayName)} · ${LEVEL_LABELS[state.reader.level]} · ${state.reader.points} pts</span>
    ${levelSwitcherHtml()}
    <button class="btn btn-small btn-ghost" data-action="home">Inicio</button>
    <button class="btn btn-small btn-ghost" data-action="ranking">Ranking</button>
    <button class="btn btn-small btn-ghost" data-action="switch-reader">Cambiar lector</button>
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

function renderReaderPicker() {
  const canAdd = state.readers.length < state.maxReaders;
  app.innerHTML = `
    <section class="card stack">
      <h2>¿Con qué lector seguimos?</h2>
      <p class="subtitle">Elegí un lector de esta cuenta. Cada uno tiene su nombre, nivel y puntos.</p>
      <ul class="reader-list">
        ${state.readers
          .map(
            (r) => `
          <li>
            <button type="button" class="reader-card" data-action="activate-reader" data-reader-id="${escapeHtml(r.id)}">
              <strong>${escapeHtml(r.displayName)}</strong>
              <span>${LEVEL_LABELS[r.level]} · ${r.points} pts · ${r.storiesRead} cuentos</span>
            </button>
          </li>`
          )
          .join("")}
      </ul>
      ${
        canAdd
          ? `<button class="btn btn-primary" type="button" data-action="create-reader">+ Agregar lector</button>`
          : `<p class="subtitle">Ya tenés ${state.maxReaders} lectores (máximo).</p>`
      }
      <button class="btn-text-link" type="button" data-action="logout">Salir y usar otra cuenta</button>
    </section>
  `;
}

function renderCreateReader({ firstAccount = false } = {}) {
  app.innerHTML = `
    <section class="card stack">
      <h2>${firstAccount ? "Creá tu primer lector" : "Nuevo lector"}</h2>
      <p class="subtitle">Elegí un nombre único (aparece en el ranking) y el nivel de lectura. Primero preguntale a mamá o papá.</p>
      <form id="reader-form" class="stack">
        <input
          class="input"
          name="displayName"
          maxlength="40"
          placeholder="Ej: Capitán Libro, Tomás, La Zurda Mágica..."
          required
        />
        <fieldset class="level-picker">
          <legend>Nivel de lectura</legend>
          <label class="option"><input type="radio" name="level" value="1" checked required /> 1° — Aprendiendo a leer (6-7 años)</label>
          <label class="option"><input type="radio" name="level" value="2" required /> 2° — Ya lee con fluidez (8-9 años)</label>
          <label class="option"><input type="radio" name="level" value="3" required /> 3° — Lector avanzado (10-12 años)</label>
        </fieldset>
        <div class="row name-form-actions">
          <button class="btn btn-primary" type="submit">¡Listo, a leer!</button>
          ${!firstAccount ? `<button class="btn btn-ghost" type="button" data-action="pick-reader">Cancelar</button>` : ""}
        </div>
      </form>
      ${
        firstAccount
          ? `<button class="btn-text-link" type="button" data-action="logout">Salir y usar otra cuenta</button>`
          : ""
      }
    </section>
  `;

  document.getElementById("reader-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const data = await api("/api/readers", {
        method: "POST",
        body: JSON.stringify({
          displayName: fd.get("displayName"),
          level: Number(fd.get("level")),
        }),
      });
      state.reader = data.reader;
      const me = await api("/api/me");
      state.readers = me.readers;
      renderNav();
      renderHome();
    } catch (err) {
      alert(err.message);
    }
  });
}

function renderHome() {
  const r = state.reader;
  const unread = r.unreadStories ?? 0;
  const allRead = unread === 0 && (r.totalStories ?? 0) > 0;
  const noStoriesAtLevel = (r.totalStories ?? 0) === 0;

  const progressText = noStoriesAtLevel
    ? `Todavía no hay cuentos de ${LEVEL_LABELS[r.level].toLowerCase()}. Probá otro nivel o volvé pronto.`
    : allRead
      ? `¡Leíste todos los cuentos de ${LEVEL_LABELS[r.level].toLowerCase()}! Podés repasar uno al azar.`
      : unread > 0
        ? `Te quedan <strong>${unread}</strong> cuento${unread === 1 ? "" : "s"} nuevo${unread === 1 ? "" : "s"} de ${LEVEL_LABELS[r.level].toLowerCase()}.`
        : "Te toca un cuento al azar. Léelo con calma y responde las 3 preguntas.";

  app.innerHTML = `
    <section class="card stack">
      <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
        <h2>Hola, ${escapeHtml(r.displayName)} 👋</h2>
        <span class="badge">${r.points} puntos · ${r.storiesRead} cuentos (${LEVEL_LABELS[r.level]})</span>
      </div>
      ${levelSwitcherHtml()}
      <p class="subtitle">${progressText}</p>
      <div class="points-breakdown">
        <span class="chip">+1 leer</span>
        <span class="chip">+1 por acierto</span>
        <span class="chip">+1 bonus si las 3 son correctas</span>
      </div>
      <button class="btn btn-primary" data-action="new-story" ${noStoriesAtLevel ? "disabled" : ""}>📖 Dame un cuento</button>
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
    ? `<p class="vocab-hint" style="background:#fffbeb;border-color:#fcd34d;color:#b45309">📚 Ya leíste todos los cuentos nuevos de este nivel. Este es un repaso al azar.</p>`
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
      state.reader.points = result.totalPoints;
      state.reader.storiesRead = result.storiesRead;
      state.reader.unreadStories = result.unreadStories;
      state.reader.totalStories = result.totalStories;
      if (result.level) state.reader.level = result.level;
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
      <p>Total acumulado: <strong>${state.reader.points} puntos</strong></p>
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
      <p class="subtitle">¿Quién irá ganando? ¡Seguí sumando puntos!</p>
      <ul class="ranking-list">
        ${
          ranking.length
            ? ranking
                .map(
                  (r) => `
            <li class="ranking-item ${state.reader?.displayName === r.displayName ? "me" : ""}">
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

async function refreshMe() {
  const data = await api("/api/me");
  state.account = data.account;
  state.reader = data.reader;
  state.readers = data.readers ?? [];
  state.maxReaders = data.maxReaders ?? 4;
  return data;
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

async function activateReader(readerId) {
  const data = await api(`/api/readers/${readerId}/activate`, { method: "POST" });
  state.reader = data.reader;
  await refreshMe();
  renderNav();
  renderHome();
}

async function changeLevel(level) {
  if (!state.reader) return;
  const data = await api(`/api/readers/${state.reader.id}/level`, {
    method: "PATCH",
    body: JSON.stringify({ level }),
  });
  state.reader = data.reader;
  await refreshMe();
  renderNav();
  renderHome();
}

async function bootstrap() {
  const params = new URLSearchParams(location.search);
  const authError = params.get("error") === "auth" ? "No pudimos completar el ingreso con Google. Intentá de nuevo." : null;
  if (authError) history.replaceState({}, "", "/");

  const data = await refreshMe();
  if (!data.authenticated) {
    state.account = null;
    state.reader = null;
    renderNav();
    renderLogin(authError);
    return;
  }

  if (!state.readers.length) {
    renderNav();
    renderCreateReader({ firstAccount: true });
    return;
  }

  if (!hasActiveReader()) {
    renderNav();
    renderReaderPicker();
    return;
  }

  renderNav();
  renderHome();
}

async function handleAction(action, el) {
  if (action === "logout") {
    await api("/auth/logout", { method: "POST" });
    location.reload();
    return;
  }
  if (action === "switch-reader" || action === "pick-reader") {
    state.reader = null;
    await refreshMe();
    renderNav();
    renderReaderPicker();
    return;
  }
  if (action === "create-reader") {
    renderCreateReader();
    return;
  }
  if (action === "activate-reader") {
    await activateReader(el.dataset.readerId);
    return;
  }
  if (action === "set-level") {
    const level = Number(el.dataset.level);
    if (level !== state.reader?.level) await changeLevel(level);
    return;
  }
  if (!hasActiveReader()) {
    renderReaderPicker();
    return;
  }
  if (action === "new-story") await loadStory();
  if (action === "ranking") await loadRanking();
  if (action === "home") renderHome();
}

nav.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  closeMobileNav();
  try {
    await handleAction(btn.dataset.action, btn);
  } catch (err) {
    alert(err.message);
  }
});

navToggle.addEventListener("click", () => {
  if (nav.classList.contains("hidden")) return;
  if (nav.classList.contains("nav-open")) closeMobileNav();
  else {
    nav.classList.add("nav-open");
    navToggle.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Cerrar menú");
  }
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
  try {
    await handleAction(btn.dataset.action, btn);
  } catch (err) {
    alert(err.message);
  }
});

bootstrap();
