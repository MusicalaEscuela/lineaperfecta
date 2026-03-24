/* =========================================================
   MUSI · LÍNEA PERFECTA
   scoring.js
   Evaluación del trazo del jugador
========================================================= */

import { getPathLength } from "./line-engine.js";

/* =========================================================
   API PRINCIPAL
========================================================= */

export function scoreAttempt({
  userPath = [],
  targetPath = [],
  elapsedMs = 0,
  expectedDurationMs = 7000,
  allowedError = 28,
  canvasWidth = 1280,
  canvasHeight = 720
}) {
  if (!Array.isArray(userPath) || userPath.length < 2) {
    return buildEmptyResult();
  }

  if (!Array.isArray(targetPath) || targetPath.length < 2) {
    return buildEmptyResult();
  }

  const sampledUser = normalizeSampleCount(userPath, 120);
  const sampledTarget = normalizeSampleCount(targetPath, 120);

  const {
    avgError,
    maxError,
    errorSamples
  } = computePathError(sampledUser, sampledTarget);

  const accuracy = computeAccuracy(avgError, allowedError);
  const flow = computeFlow(userPath);
  const control = computeControl({
    avgError,
    maxError,
    allowedError,
    flow
  });
  const tempo = computeTempoScore(elapsedMs, expectedDurationMs);
  const completion = computeCompletionScore(userPath, targetPath);

  const weightedRaw =
    accuracy * 0.46 +
    flow * 0.18 +
    control * 0.18 +
    tempo * 0.08 +
    completion * 0.10;

  const score = Math.round(weightedRaw * 10);

  return {
    score,
    accuracy: roundInt(accuracy),
    flow: roundInt(flow),
    control: roundInt(control),
    tempo: roundInt(tempo),
    completion: roundInt(completion),

    avgError: roundInt(avgError),
    maxError: roundInt(maxError),
    elapsedMs: Math.round(elapsedMs),

    userLength: roundInt(getPathLength(userPath)),
    targetLength: roundInt(getPathLength(targetPath)),

    errorSamples,
    stars: 0,
    grade: "C",
    feedback: ""
  };
}

/* =========================================================
   MÉTRICAS PRINCIPALES
========================================================= */

function computePathError(userPath, targetPath) {
  const count = Math.min(userPath.length, targetPath.length);
  let totalError = 0;
  let maxError = 0;
  const errorSamples = [];

  for (let i = 0; i < count; i += 1) {
    const userPoint = userPath[i];
    const targetPoint = targetPath[i];
    const error = distanceBetween(userPoint, targetPoint);

    totalError += error;
    if (error > maxError) maxError = error;
    errorSamples.push(error);
  }

  const avgError = count > 0 ? totalError / count : 999;

  return {
    avgError,
    maxError,
    errorSamples
  };
}

function computeAccuracy(avgError, allowedError) {
  if (!Number.isFinite(avgError)) return 0;
  if (!Number.isFinite(allowedError) || allowedError <= 0) return 0;

  const normalized = avgError / allowedError;

  if (normalized <= 0.22) return 100;
  if (normalized >= 2.6) return 0;

  const value = 100 - ((normalized - 0.22) / (2.6 - 0.22)) * 100;
  return clamp(value, 0, 100);
}

function computeFlow(path) {
  if (!Array.isArray(path) || path.length < 3) return 0;

  let totalTurn = 0;
  let count = 0;

  for (let i = 1; i < path.length - 1; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const c = path[i + 1];

    const angle1 = Math.atan2(b.y - a.y, b.x - a.x);
    const angle2 = Math.atan2(c.y - b.y, c.x - b.x);

    let turn = Math.abs(angle2 - angle1);
    if (turn > Math.PI) turn = Math.PI * 2 - turn;

    totalTurn += turn;
    count += 1;
  }

  const avgTurn = count > 0 ? totalTurn / count : Math.PI;
  const normalized = avgTurn / Math.PI;

  const flow = 100 - normalized * 140;
  return clamp(flow, 0, 100);
}

function computeControl({ avgError, maxError, allowedError, flow }) {
  const avgComponent = 100 - (avgError / (allowedError * 2.2)) * 100;
  const maxComponent = 100 - (maxError / (allowedError * 4)) * 100;

  const control =
    clamp(avgComponent, 0, 100) * 0.55 +
    clamp(maxComponent, 0, 100) * 0.25 +
    clamp(flow, 0, 100) * 0.20;

  return clamp(control, 0, 100);
}

function computeTempoScore(elapsedMs, expectedDurationMs) {
  if (!expectedDurationMs || expectedDurationMs <= 0) return 100;
  if (!elapsedMs || elapsedMs <= 0) return 40;

  const ratio = elapsedMs / expectedDurationMs;
  const deviation = Math.abs(1 - ratio);

  const score = 100 - deviation * 120;
  return clamp(score, 0, 100);
}

function computeCompletionScore(userPath, targetPath) {
  const userLength = getPathLength(userPath);
  const targetLength = getPathLength(targetPath);

  if (targetLength <= 0) return 0;

  const ratio = userLength / targetLength;

  if (ratio >= 0.9 && ratio <= 1.12) return 100;
  if (ratio < 0.45) return 25;

  const deviation = Math.abs(1 - ratio);
  const score = 100 - deviation * 180;

  return clamp(score, 0, 100);
}

/* =========================================================
   RESULTADOS / GRADOS / ESTRELLAS
========================================================= */

export function accuracyToGrade(accuracy) {
  if (accuracy >= 95) return "S";
  if (accuracy >= 87) return "A";
  if (accuracy >= 75) return "B";
  if (accuracy >= 60) return "C";
  return "D";
}

export function accuracyToStars(accuracy) {
  if (accuracy >= 90) return 3;
  if (accuracy >= 72) return 2;
  if (accuracy >= 50) return 1;
  return 0;
}

export function buildFeedbackMessage(result) {
  const accuracy = result?.accuracy ?? 0;
  const flow = result?.flow ?? 0;
  const control = result?.control ?? 0;

  if (accuracy >= 95 && flow >= 85) {
    return "Trazo casi perfecto. Muy buen pulso, muy buena fluidez. Así sí provoca enmarcarlo.";
  }

  if (accuracy >= 88) {
    return "Excelente trabajo. El recorrido quedó limpio y con bastante control.";
  }

  if (accuracy >= 75) {
    return "Muy bien. Hubo buen manejo del trazo, aunque todavía se puede afinar un poco más.";
  }

  if (accuracy >= 60) {
    if (flow < 55) {
      return "Buen intento. Vas siguiendo la ruta, pero el movimiento estuvo algo tembloroso.";
    }

    if (control < 55) {
      return "Buen intento. Te acercaste bastante, pero en varios puntos se fue el control.";
    }

    return "Buen intento. La base está, solo falta más precisión para que el trazo se vea realmente fino.";
  }

  if (accuracy >= 40) {
    return "Se entiende la intención, pero te saliste bastante del camino. Toca bajar la ansiedad del mouse 😌";
  }

  return "Ese trazo quedó bien salvaje. Respira, vuelve al inicio y síguelo con más calma.";
}

/* =========================================================
   HELPERS DE MUESTREO
========================================================= */

function normalizeSampleCount(path, targetCount = 120) {
  if (!Array.isArray(path) || path.length === 0) return [];
  if (path.length === targetCount) return [...path];
  if (path.length === 1) return Array.from({ length: targetCount }, () => ({ ...path[0] }));

  const result = [];

  for (let i = 0; i < targetCount; i += 1) {
    const t = i / (targetCount - 1);
    const index = t * (path.length - 1);

    const low = Math.floor(index);
    const high = Math.min(path.length - 1, Math.ceil(index));
    const localT = index - low;

    const a = path[low];
    const b = path[high];

    result.push({
      x: lerp(a.x, b.x, localT),
      y: lerp(a.y, b.y, localT)
    });
  }

  return result;
}

/* =========================================================
   HELPERS GENERALES
========================================================= */

function buildEmptyResult() {
  return {
    score: 0,
    accuracy: 0,
    flow: 0,
    control: 0,
    tempo: 0,
    completion: 0,
    avgError: 0,
    maxError: 0,
    elapsedMs: 0,
    userLength: 0,
    targetLength: 0,
    errorSamples: [],
    stars: 0,
    grade: "D",
    feedback: "No hubo suficiente trazo para evaluar."
  };
}

function distanceBetween(a, b) {
  const dx = (a?.x ?? 0) - (b?.x ?? 0);
  const dy = (a?.y ?? 0) - (b?.y ?? 0);
  return Math.hypot(dx, dy);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function roundInt(value) {
  return Math.round(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}