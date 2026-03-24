/* =========================================================
   MUSI · LÍNEA PERFECTA
   ui.js
   Utilidades de interfaz para el minijuego
========================================================= */

/* =========================================================
   TEXTO / CONTENIDO
========================================================= */

export function setText(element, value) {
  if (!element) return;
  element.textContent = value ?? "";
}

export function setHTML(element, value) {
  if (!element) return;
  element.innerHTML = value ?? "";
}

/* =========================================================
   BOTONES / ESTADOS BÁSICOS
========================================================= */

export function setButtonDisabled(button, disabled = true) {
  if (!button) return;
  button.disabled = !!disabled;
  button.setAttribute("aria-disabled", String(!!disabled));
}

export function showElement(element, display = "") {
  if (!element) return;
  element.style.display = display;
}

export function hideElement(element) {
  if (!element) return;
  element.style.display = "none";
}

export function toggleClass(element, className, force) {
  if (!element || !className) return;
  element.classList.toggle(className, force);
}

/* =========================================================
   STATUS / HUD
========================================================= */

export function setStatus(dotEl, textEl, type = "idle", label = "") {
  if (!dotEl || !textEl) return;

  dotEl.classList.remove("is-playing", "is-error");

  switch (type) {
    case "playing":
      dotEl.classList.add("is-playing");
      break;
    case "error":
      dotEl.classList.add("is-error");
      break;
    default:
      break;
  }

  setText(textEl, label);
}

export function setProgressDots(container, total = 0, activeIndex = 0, options = {}) {
  if (!container) return;

  const completedCount = Number.isFinite(options.completedCount)
    ? options.completedCount
    : 0;

  container.innerHTML = "";

  for (let i = 0; i < total; i += 1) {
    const dot = document.createElement("span");
    dot.className = "dot";

    if (i < completedCount) {
      dot.classList.add("is-done");
    }

    if (i === activeIndex) {
      dot.classList.add("is-active");
    }

    dot.setAttribute("aria-hidden", "true");
    container.appendChild(dot);
  }
}

/* =========================================================
   RESULTADO ACTUAL EN PANEL
========================================================= */

export function setResultSummary(refs, result) {
  if (!refs) return;

  const {
    gradeEl,
    starsEl,
    accuracyEl,
    flowEl,
    controlEl
  } = refs;

  if (!result) {
    setText(gradeEl, "--");
    setText(starsEl, "☆ ☆ ☆");
    setText(accuracyEl, "0%");
    setText(flowEl, "0%");
    setText(controlEl, "0%");
    return;
  }

  setText(gradeEl, result.grade ?? "--");
  setText(starsEl, buildStarsString(result.stars ?? 0, true));
  setText(accuracyEl, `${result.accuracy ?? 0}%`);
  setText(flowEl, `${result.flow ?? 0}%`);
  setText(controlEl, `${result.control ?? 0}%`);

  applyGradeClass(gradeEl, result.grade);
}

/* =========================================================
   MODAL
========================================================= */

export function openResultModal(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

export function closeResultModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

/* =========================================================
   OVERLAY DE INICIO
========================================================= */

export function updateStartOverlay(startCard, hasStarted = false) {
  if (!startCard) return;

  if (hasStarted) {
    startCard.classList.add("is-hidden");
    startCard.setAttribute("aria-hidden", "true");
  } else {
    startCard.classList.remove("is-hidden");
    startCard.setAttribute("aria-hidden", "false");
  }
}

/* =========================================================
   FEEDBACK VISUAL
========================================================= */

export function flashFeedback(element) {
  if (!element) return;

  element.classList.remove("ui-flash");
  // forzar reflow, sí, la vieja confiable
  void element.offsetWidth;
  element.classList.add("ui-flash");

  window.setTimeout(() => {
    element.classList.remove("ui-flash");
  }, 420);
}

/* =========================================================
   HELPERS
========================================================= */

function buildStarsString(stars = 0, spaced = false) {
  const full = "★".repeat(Math.max(0, Math.min(3, stars)));
  const empty = "☆".repeat(Math.max(0, 3 - stars));
  const combined = `${full}${empty}`;

  if (!spaced) return combined;
  return combined.split("").join(" ");
}

function applyGradeClass(element, grade = "") {
  if (!element) return;

  element.classList.remove(
    "grade-s",
    "grade-a",
    "grade-b",
    "grade-c",
    "grade-d"
  );

  const normalized = String(grade || "").toUpperCase();

  switch (normalized) {
    case "S":
      element.classList.add("grade-s");
      break;
    case "A":
      element.classList.add("grade-a");
      break;
    case "B":
      element.classList.add("grade-b");
      break;
    case "C":
      element.classList.add("grade-c");
      break;
    default:
      element.classList.add("grade-d");
      break;
  }
}