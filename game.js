import { LEVELS } from "./levels.js";
import {
  resizeCanvasForDisplay,
  getPointerPosFromEvent,
  drawLevelScene,
  smoothPath,
  getPathLength
} from "./line-engine.js";
import {
  scoreAttempt,
  accuracyToGrade,
  accuracyToStars,
  buildFeedbackMessage
} from "./scoring.js";
import {
  setText,
  setStatus,
  setProgressDots,
  setResultSummary,
  openResultModal,
  closeResultModal,
  updateStartOverlay,
  setButtonDisabled,
  flashFeedback
} from "./ui.js";

/* =========================================================
   MUSI · LÍNEA PERFECTA
   game.js
   Lógica principal del minijuego
========================================================= */

const STORAGE_KEY = "musi_linea_perfecta_best";
const DEFAULT_KEYWORD = "TRAZO";

const state = {
  levelIndex: 0,
  isReady: false,
  isPlaying: false,
  isDrawing: false,
  hasFinishedAttempt: false,

  currentLevel: null,

  pointerTrail: [],
  smoothedTrail: [],

  startTimeMs: 0,
  elapsedMs: 0,

  score: 0,
  totalStars: 0,
  lastResult: null,

  animationFrameId: null,
  bestAccuracy: null
};

/* =========================================================
   DOM
========================================================= */

const els = {
  canvas: document.getElementById("game-canvas"),
  canvasOverlay: document.getElementById("canvas-overlay"),
  startCard: document.getElementById("start-card"),

  btnStart: document.getElementById("btn-start"),
  btnClear: document.getElementById("btn-clear"),
  btnRestart: document.getElementById("btn-restart"),
  btnNext: document.getElementById("btn-next"),
  btnMenu: document.getElementById("btn-menu"),
  btnRetryModal: document.getElementById("btn-retry-modal"),
  btnContinueModal: document.getElementById("btn-continue-modal"),

  hudLevel: document.getElementById("hud-level"),
  hudScore: document.getElementById("hud-score"),
  hudAccuracy: document.getElementById("hud-accuracy"),
  hudStars: document.getElementById("hud-stars"),
  hudTime: document.getElementById("hud-time"),
  hudError: document.getElementById("hud-error"),

  feedbackText: document.getElementById("feedback-text"),
  missionText: document.getElementById("mission-text"),
  roundLabel: document.getElementById("round-label"),
  keywordValue: document.getElementById("keyword-value"),
  mascotText: document.getElementById("mascot-text"),

  statusDot: document.getElementById("status-dot"),
  statusText: document.getElementById("status-text"),

  progressDots: document.getElementById("progress-dots"),

  resultGrade: document.getElementById("result-grade"),
  resultStars: document.getElementById("result-stars"),
  resultAccuracy: document.getElementById("result-accuracy"),
  resultFlow: document.getElementById("result-flow"),
  resultControl: document.getElementById("result-control"),

  modal: document.getElementById("result-modal"),
  modalTitle: document.getElementById("modal-title"),
  modalMessage: document.getElementById("modal-message"),
  modalScore: document.getElementById("modal-score"),
  modalAccuracy: document.getElementById("modal-accuracy"),
  modalStars: document.getElementById("modal-stars"),
  modalKeyword: document.getElementById("modal-keyword")
};

const ctx = els.canvas.getContext("2d", { alpha: true });

/* =========================================================
   INIT
========================================================= */

init();

function init() {
  loadPersistentData();
  bindEvents();
  buildProgress();
  prepareLevel(state.levelIndex);
  handleResize();
  renderLoop();
}

/* =========================================================
   PERSISTENCIA
========================================================= */

function loadPersistentData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state.bestAccuracy = null;
      return;
    }

    const parsed = JSON.parse(raw);
    state.bestAccuracy =
      typeof parsed.bestAccuracy === "number" ? parsed.bestAccuracy : null;
  } catch {
    state.bestAccuracy = null;
  }
}

function savePersistentData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        bestAccuracy: state.bestAccuracy
      })
    );
  } catch {
    // silencio elegante, como muchos proyectos humanos cuando fallan en producción
  }
}

/* =========================================================
   EVENTOS
========================================================= */

function bindEvents() {
  window.addEventListener("resize", handleResize);

  els.btnStart?.addEventListener("click", startLevel);
  els.btnClear?.addEventListener("click", clearCurrentAttempt);
  els.btnRestart?.addEventListener("click", restartLevel);
  els.btnNext?.addEventListener("click", goToNextLevel);

  els.btnRetryModal?.addEventListener("click", () => {
    closeResultModal(els.modal);
    restartLevel();
  });

  els.btnContinueModal?.addEventListener("click", () => {
    closeResultModal(els.modal);
    goToNextLevel();
  });

  els.btnMenu?.addEventListener("click", () => {
    window.location.href = "../menu.html";
  });

  els.canvas.addEventListener("pointerdown", onPointerDown);
  els.canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

function handleResize() {
  resizeCanvasForDisplay(els.canvas);
  draw();
}

/* =========================================================
   NIVELES
========================================================= */

function buildProgress() {
  setProgressDots(els.progressDots, LEVELS.length, state.levelIndex);
}

function prepareLevel(levelIndex) {
  state.levelIndex = clamp(levelIndex, 0, LEVELS.length - 1);
  state.currentLevel = LEVELS[state.levelIndex];

  state.isReady = true;
  state.isPlaying = false;
  state.isDrawing = false;
  state.hasFinishedAttempt = false;

  state.pointerTrail = [];
  state.smoothedTrail = [];
  state.startTimeMs = 0;
  state.elapsedMs = 0;
  state.lastResult = null;

  updateLevelUI();
  updateStartOverlay(els.startCard, false);
  closeResultModal(els.modal);
  setButtonDisabled(els.btnNext, true);

  setStatus(els.statusDot, els.statusText, "idle", "Esperando inicio");
  setText(els.feedbackText, "Toca comenzar para iniciar el trazo.");
  setText(
    els.mascotText,
    state.currentLevel.mascotTip ||
      "Respira, suelta la mano y sigue la forma. Nada de pelear con la línea."
  );

  draw();
}

function updateLevelUI() {
  const level = state.currentLevel;
  const levelNumber = state.levelIndex + 1;

  setText(els.hudLevel, String(levelNumber));
  setText(els.roundLabel, `Ronda ${levelNumber}`);
  setText(els.hudScore, String(Math.round(state.score)));
  setText(els.hudStars, String(state.totalStars));
  setText(els.hudAccuracy, state.lastResult ? `${state.lastResult.accuracy}%` : "0%");
  setText(els.hudTime, formatTime(state.elapsedMs));
  setText(els.hudError, state.lastResult ? String(state.lastResult.avgError) : "0");

  setText(
    els.missionText,
    level.mission ||
      "Traza la línea guía desde el punto inicial hasta el final sin salirte demasiado del camino."
  );

  setText(els.keywordValue, level.keyword || DEFAULT_KEYWORD);

  if (state.bestAccuracy !== null) {
    const best = `${Math.round(state.bestAccuracy)}%`;
    const bestEl = document.getElementById("hud-best");
    if (bestEl) setText(bestEl, best);
  }

  setProgressDots(els.progressDots, LEVELS.length, state.levelIndex, {
    completedCount: getCompletedCount()
  });

  if (state.lastResult) {
    setResultSummary({
      gradeEl: els.resultGrade,
      starsEl: els.resultStars,
      accuracyEl: els.resultAccuracy,
      flowEl: els.resultFlow,
      controlEl: els.resultControl
    }, state.lastResult);
  } else {
    setResultSummary({
      gradeEl: els.resultGrade,
      starsEl: els.resultStars,
      accuracyEl: els.resultAccuracy,
      flowEl: els.resultFlow,
      controlEl: els.resultControl
    }, null);
  }
}

function getCompletedCount() {
  return Math.min(state.levelIndex, LEVELS.length);
}

/* =========================================================
   CONTROL DEL JUEGO
========================================================= */

function startLevel() {
  if (!state.currentLevel || state.isPlaying) return;

  state.isPlaying = true;
  state.isDrawing = false;
  state.hasFinishedAttempt = false;
  state.pointerTrail = [];
  state.smoothedTrail = [];
  state.startTimeMs = performance.now();
  state.elapsedMs = 0;
  state.lastResult = null;

  updateStartOverlay(els.startCard, true);
  closeResultModal(els.modal);
  setButtonDisabled(els.btnNext, true);
  setStatus(els.statusDot, els.statusText, "playing", "Traza la línea");
  setText(
    els.feedbackText,
    "Empieza en el punto inicial y sigue el recorrido con calma."
  );
  flashFeedback(els.feedbackText);

  updateLevelUI();
  draw();
}

function clearCurrentAttempt() {
  if (!state.isPlaying) return;

  state.pointerTrail = [];
  state.smoothedTrail = [];
  state.hasFinishedAttempt = false;
  state.elapsedMs = state.startTimeMs ? performance.now() - state.startTimeMs : 0;

  setText(els.feedbackText, "Trazo limpiado. Intenta otra vez sin rabia digital.");
  setStatus(els.statusDot, els.statusText, "playing", "Traza la línea");
  draw();
}

function restartLevel() {
  state.pointerTrail = [];
  state.smoothedTrail = [];
  state.isDrawing = false;
  state.hasFinishedAttempt = false;
  state.isPlaying = false;
  state.elapsedMs = 0;
  state.lastResult = null;

  updateStartOverlay(els.startCard, false);
  setStatus(els.statusDot, els.statusText, "idle", "Esperando reinicio");
  setText(els.feedbackText, "Nivel reiniciado. Cuando quieran, vuelvan a empezar.");
  setButtonDisabled(els.btnNext, true);

  updateLevelUI();
  draw();
}

function goToNextLevel() {
  const nextIndex = state.levelIndex + 1;

  if (nextIndex >= LEVELS.length) {
    setStatus(els.statusDot, els.statusText, "idle", "Juego completado");
    setText(
      els.feedbackText,
      "Completaron todos los trazos. Milagrosamente, sí hubo control de pulso. 🎨"
    );
    setButtonDisabled(els.btnNext, true);
    return;
  }

  prepareLevel(nextIndex);
}

/* =========================================================
   INPUT / POINTER
========================================================= */

function onPointerDown(event) {
  if (!state.isPlaying || state.hasFinishedAttempt) return;

  const point = getPointerPosFromEvent(event, els.canvas);

  if (!isNearStartPoint(point, state.currentLevel)) {
    setText(
      els.feedbackText,
      "Empieza desde el punto inicial. El caos libre lo dejamos para otra obra."
    );
    setStatus(els.statusDot, els.statusText, "error", "Inicio incorrecto");
    flashFeedback(els.feedbackText);
    return;
  }

  els.canvas.setPointerCapture?.(event.pointerId);

  state.isDrawing = true;
  state.pointerTrail = [point];
  state.smoothedTrail = [point];

  setStatus(els.statusDot, els.statusText, "playing", "Trazando");
  setText(els.feedbackText, "Buen inicio. Sigue la guía hasta el final.");
  draw();
}

function onPointerMove(event) {
  if (!state.isPlaying || !state.isDrawing || state.hasFinishedAttempt) return;

  const point = getPointerPosFromEvent(event, els.canvas);
  const last = state.pointerTrail[state.pointerTrail.length - 1];

  if (!last || distanceBetween(last, point) > 1.5) {
    state.pointerTrail.push(point);
    state.smoothedTrail = smoothPath(state.pointerTrail, 2);
  }

  const liveError = estimateLiveError();
  const liveFeedback = getLiveFeedback(liveError);

  setText(els.feedbackText, liveFeedback.message);
  setText(els.hudError, String(Math.round(liveError)));
  setStatus(els.statusDot, els.statusText, liveFeedback.status, liveFeedback.label);

  if (isNearEndPoint(point, state.currentLevel) && state.pointerTrail.length > 12) {
    finishAttempt();
    return;
  }

  draw();
}

function onPointerUp() {
  if (!state.isPlaying || !state.isDrawing || state.hasFinishedAttempt) return;
  state.isDrawing = false;

  if (!state.pointerTrail.length) return;

  const lastPoint = state.pointerTrail[state.pointerTrail.length - 1];
  if (isNearEndPoint(lastPoint, state.currentLevel)) {
    finishAttempt();
  } else {
    setStatus(els.statusDot, els.statusText, "error", "Trazo incompleto");
    setText(
      els.feedbackText,
      "Te faltó llegar al final. Casi, pero no tanto. Vuelve a intentarlo."
    );
    flashFeedback(els.feedbackText);
    draw();
  }
}

/* =========================================================
   EVALUACIÓN
========================================================= */

function finishAttempt() {
  state.isDrawing = false;
  state.isPlaying = false;
  state.hasFinishedAttempt = true;
  state.elapsedMs = state.startTimeMs ? performance.now() - state.startTimeMs : 0;

  const level = state.currentLevel;
  const finalTrail = smoothPath(state.pointerTrail, 3);
  const targetPath = level.path;

  const result = scoreAttempt({
    userPath: finalTrail,
    targetPath,
    elapsedMs: state.elapsedMs,
    expectedDurationMs: level.expectedDurationMs || 7000,
    allowedError: level.allowedError || 28,
    canvasWidth: els.canvas.width,
    canvasHeight: els.canvas.height
  });

  result.grade = accuracyToGrade(result.accuracy);
  result.stars = accuracyToStars(result.accuracy);
  result.feedback = buildFeedbackMessage(result);
  result.keyword = level.keyword || DEFAULT_KEYWORD;

  state.lastResult = result;
  state.pointerTrail = finalTrail;
  state.smoothedTrail = finalTrail;
  state.score += result.score;
  state.totalStars += result.stars;

  if (state.bestAccuracy === null || result.accuracy > state.bestAccuracy) {
    state.bestAccuracy = result.accuracy;
    savePersistentData();
  }

  setStatus(els.statusDot, els.statusText, "idle", "Nivel completado");
  setText(els.feedbackText, result.feedback);
  flashFeedback(els.feedbackText);

  updateLevelUI();
  setButtonDisabled(els.btnNext, false);
  openEndModal(result);
  draw();
}

function openEndModal(result) {
  setText(els.modalTitle, getModalTitleByGrade(result.grade));
  setText(els.modalMessage, result.feedback);
  setText(els.modalScore, String(result.score));
  setText(els.modalAccuracy, `${result.accuracy}%`);
  setText(els.modalStars, "★".repeat(result.stars).padEnd(3, "☆"));
  setText(els.modalKeyword, result.keyword);

  openResultModal(els.modal);
}

/* =========================================================
   RENDER
========================================================= */

function renderLoop() {
  if (state.isPlaying && !state.hasFinishedAttempt && state.startTimeMs) {
    state.elapsedMs = performance.now() - state.startTimeMs;
    setText(els.hudTime, formatTime(state.elapsedMs));
  }

  draw();
  state.animationFrameId = requestAnimationFrame(renderLoop);
}

function draw() {
  if (!ctx || !state.currentLevel) return;

  drawLevelScene(ctx, {
    canvas: els.canvas,
    level: state.currentLevel,
    userPath: state.smoothedTrail.length ? state.smoothedTrail : state.pointerTrail,
    isPlaying: state.isPlaying,
    hasAttempt: state.pointerTrail.length > 0,
    lastResult: state.lastResult
  });
}

/* =========================================================
   FEEDBACK EN TIEMPO REAL
========================================================= */

function estimateLiveError() {
  if (!state.pointerTrail.length || !state.currentLevel?.path?.length) return 0;

  const sample = samplePath(state.pointerTrail, 18);
  const target = state.currentLevel.path;
  let total = 0;

  for (const point of sample) {
    total += getMinDistanceToPath(point, target);
  }

  return total / sample.length;
}

function getLiveFeedback(avgError) {
  if (avgError <= 12) {
    return {
      message: "Vas muy bien. Ese pulso ya parece de artista juicioso.",
      status: "playing",
      label: "Muy preciso"
    };
  }

  if (avgError <= 24) {
    return {
      message: "Buen camino. Ajusta un poquito y te queda fino.",
      status: "playing",
      label: "Precisión media"
    };
  }

  return {
    message: "Te estás saliendo bastante. Corrige antes de que esto se vuelva garabato.",
    status: "error",
    label: "Desviado"
  };
}

/* =========================================================
   UTILIDADES
========================================================= */

function isNearStartPoint(point, level) {
  const start = level.startPoint || level.path?.[0];
  if (!start) return false;
  return distanceBetween(point, start) <= (level.startRadius || 28);
}

function isNearEndPoint(point, level) {
  const path = level.path || [];
  const end = level.endPoint || path[path.length - 1];
  if (!end) return false;
  return distanceBetween(point, end) <= (level.endRadius || 30);
}

function distanceBetween(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function getMinDistanceToPath(point, path) {
  let min = Infinity;
  for (let i = 0; i < path.length; i += 1) {
    const d = distanceBetween(point, path[i]);
    if (d < min) min = d;
  }
  return min;
}

function samplePath(path, maxSamples = 20) {
  if (path.length <= maxSamples) return path;
  const step = Math.max(1, Math.floor(path.length / maxSamples));
  const sampled = [];
  for (let i = 0; i < path.length; i += step) {
    sampled.push(path[i]);
  }
  if (sampled[sampled.length - 1] !== path[path.length - 1]) {
    sampled.push(path[path.length - 1]);
  }
  return sampled;
}

function formatTime(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getModalTitleByGrade(grade) {
  switch (grade) {
    case "S":
      return "Trazo perfecto";
    case "A":
      return "Excelente pulso";
    case "B":
      return "Muy buen trabajo";
    case "C":
      return "Buen intento";
    default:
      return "Sigue practicando";
  }
}