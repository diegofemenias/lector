const WORD_SPLIT =
  /([a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+(?:['-][a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+)*)/gu;

let modalEl = null;
let currentVocabulary = {};

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("'", "&#39;");
}

export function enrichText(text, vocabulary) {
  if (!text) return "";
  if (!vocabulary || !Object.keys(vocabulary).length) {
    return escapeHtml(text);
  }

  const parts = text.split(WORD_SPLIT);
  return parts
    .map((part) => {
      if (!part) return "";
      const key = part.toLowerCase();
      if (vocabulary[key]) {
        return `<button type="button" class="word-help" data-word="${escapeAttr(key)}">${escapeHtml(part)}</button>`;
      }
      return escapeHtml(part);
    })
    .join("");
}

function ensureModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement("div");
  modalEl.id = "vocab-modal";
  modalEl.className = "vocab-modal hidden";
  modalEl.innerHTML = `
    <div class="vocab-modal-backdrop" data-close="1"></div>
    <div class="vocab-modal-card" role="dialog" aria-modal="true" aria-labelledby="vocab-modal-title">
      <button type="button" class="vocab-modal-close" data-close="1" aria-label="Cerrar">×</button>
      <p class="vocab-modal-label">¿Qué significa?</p>
      <h3 id="vocab-modal-title" class="vocab-modal-word"></h3>
      <p class="vocab-modal-def"></p>
    </div>
  `;
  document.body.appendChild(modalEl);

  modalEl.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) hideModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideModal();
  });

  return modalEl;
}

export function showVocabularyModal(word) {
  const definition = currentVocabulary[word];
  if (!definition) return;

  const modal = ensureModal();
  modal.querySelector(".vocab-modal-word").textContent = word;
  modal.querySelector(".vocab-modal-def").textContent = definition;
  modal.classList.remove("hidden");
  document.body.classList.add("vocab-modal-open");
}

export function hideModal() {
  if (!modalEl) return;
  modalEl.classList.add("hidden");
  document.body.classList.remove("vocab-modal-open");
}

export function setVocabulary(vocabulary) {
  currentVocabulary = vocabulary || {};
}

export function bindVocabularyClicks(root) {
  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".word-help");
    if (!btn) return;
    e.preventDefault();
    showVocabularyModal(btn.dataset.word);
  });
}
