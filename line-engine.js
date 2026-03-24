/* =========================================================
   MUSI · LÍNEA PERFECTA
   line-engine.js
   Motor de canvas, dibujo de trayectorias y utilidades
========================================================= */

/* =========================================================
   CONFIG VISUAL
========================================================= */

const CANVAS_BG_GRID_SIZE = 34;

const GUIDE_LINE_STYLE = {
  core: "#7b9cff",
  glow: "rgba(123, 156, 255, 0.28)",
  soft: "rgba(123, 156, 255, 0.14)"
};

const USER_LINE_STYLE = {
  core: "#ff8f66",
  glow: "rgba(255, 143, 102, 0.26)"
};

const USER_LINE_SUCCESS = {
  core: "#57c58c",
  glow: "rgba(87, 197, 140, 0.26)"
};

const START_POINT_STYLE = {
  fill: "#76d7a7",
  glow: "rgba(118, 215, 167, 0.22)"
};

const END_POINT_STYLE = {
  fill: "#ff9ec7",
  glow: "rgba(255, 158, 199, 0.22)"
};

/* =========================================================
   RESIZE / POINTER
========================================================= */

export function resizeCanvasForDisplay(canvas) {
  if (!canvas) return;

  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const rect = canvas.getBoundingClientRect();

  const displayWidth = Math.max(1, Math.round(rect.width));
  const displayHeight = Math.max(1, Math.round(rect.height));

  const targetWidth = Math.round(displayWidth * dpr);
  const targetHeight = Math.round(displayHeight * dpr);

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
}

export function getPointerPosFromEvent(event, canvas) {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

/* =========================================================
   ESCENA PRINCIPAL
========================================================= */

export function drawLevelScene(ctx, {
  canvas,
  level,
  userPath = [],
  isPlaying = false,
  hasAttempt = false,
  lastResult = null
}) {
  if (!ctx || !canvas || !level) return;

  clearCanvas(ctx, canvas);
  drawCanvasBackdrop(ctx, canvas);

  drawAmbientShapes(ctx, canvas);
  drawGuideArea(ctx, canvas, level);
  drawGuidePath(ctx, level.path);

  drawStartPoint(ctx, level.startPoint, level.startRadius || 34);
  drawEndPoint(ctx, level.endPoint, level.endRadius || 36);

  if (userPath.length > 0) {
    const strokeStyle = lastResult?.accuracy >= 80
      ? USER_LINE_SUCCESS
      : USER_LINE_STYLE;

    drawUserPath(ctx, userPath, strokeStyle);
    drawTrailMarkers(ctx, userPath);
  }

  if (!hasAttempt && !isPlaying) {
    drawHintArrows(ctx, level.path);
  }

  drawFrameHighlights(ctx, canvas);
}

/* =========================================================
   CANVAS BASE
========================================================= */

function clearCanvas(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawCanvasBackdrop(ctx, canvas) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#fffdfa");
  gradient.addColorStop(1, "#fff5ea");

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  drawGrid(ctx, canvas);
}

function drawGrid(ctx, canvas) {
  ctx.save();
  ctx.strokeStyle = "rgba(123, 80, 63, 0.05)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += CANVAS_BG_GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += CANVAS_BG_GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAmbientShapes(ctx, canvas) {
  ctx.save();

  const shapes = [
    { x: canvas.width * 0.15, y: canvas.height * 0.18, r: 90, color: "rgba(255, 214, 106, 0.10)" },
    { x: canvas.width * 0.84, y: canvas.height * 0.24, r: 110, color: "rgba(123, 156, 255, 0.08)" },
    { x: canvas.width * 0.78, y: canvas.height * 0.76, r: 130, color: "rgba(255, 158, 199, 0.08)" }
  ];

  for (const shape of shapes) {
    const radial = ctx.createRadialGradient(
      shape.x,
      shape.y,
      0,
      shape.x,
      shape.y,
      shape.r
    );
    radial.addColorStop(0, shape.color);
    radial.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawGuideArea(ctx, canvas, level) {
  const bounds = getPathBounds(level.path, 56);

  ctx.save();

  const areaGradient = ctx.createLinearGradient(
    bounds.minX,
    bounds.minY,
    bounds.maxX,
    bounds.maxY
  );
  areaGradient.addColorStop(0, "rgba(123, 156, 255, 0.05)");
  areaGradient.addColorStop(1, "rgba(135, 230, 245, 0.06)");

  roundRectPath(
    ctx,
    bounds.minX,
    bounds.minY,
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    28
  );

  ctx.fillStyle = areaGradient;
  ctx.fill();

  ctx.strokeStyle = "rgba(123, 156, 255, 0.10)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawFrameHighlights(ctx, canvas) {
  ctx.save();

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "rgba(255,255,255,0.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;

  roundRectPath(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 28);
  ctx.stroke();

  ctx.restore();
}

/* =========================================================
   GUIDE PATH
========================================================= */

function drawGuidePath(ctx, path) {
  if (!path || path.length < 2) return;

  ctx.save();

  drawRoundedPolyline(ctx, path, 26, GUIDE_LINE_STYLE.glow, "round", "round");

  drawRoundedPolyline(ctx, path, 16, GUIDE_LINE_STYLE.soft, "round", "round");

  ctx.setLineDash([14, 12]);
  drawRoundedPolyline(ctx, path, 7, GUIDE_LINE_STYLE.core, "round", "round");
  ctx.setLineDash([]);

  ctx.restore();
}

/* =========================================================
   USER PATH
========================================================= */

function drawUserPath(ctx, path, style = USER_LINE_STYLE) {
  if (!path || path.length < 2) return;

  ctx.save();

  drawRoundedPolyline(ctx, path, 22, style.glow, "round", "round");
  drawRoundedPolyline(ctx, path, 9, style.core, "round", "round");

  ctx.restore();
}

function drawTrailMarkers(ctx, path) {
  if (!path || path.length < 2) return;

  const step = Math.max(8, Math.floor(path.length / 12));

  ctx.save();
  for (let i = 0; i < path.length; i += step) {
    const p = path[i];
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* =========================================================
   START / END / HINTS
========================================================= */

function drawStartPoint(ctx, point, radius = 34) {
  if (!point) return;

  drawPulsePoint(ctx, point, radius, START_POINT_STYLE);
  drawPointLabel(ctx, point, "INICIO", "#2f8e63");
}

function drawEndPoint(ctx, point, radius = 36) {
  if (!point) return;

  drawPulsePoint(ctx, point, radius, END_POINT_STYLE);
  drawPointLabel(ctx, point, "FIN", "#cc5b8d");
}

function drawPulsePoint(ctx, point, radius, style) {
  ctx.save();

  ctx.beginPath();
  ctx.fillStyle = style.glow;
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = style.fill;
  ctx.arc(point.x, point.y, radius * 0.44, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.arc(point.x, point.y, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPointLabel(ctx, point, text, color) {
  ctx.save();
  ctx.font = "800 18px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = color;
  ctx.fillText(text, point.x, point.y - 18);
  ctx.restore();
}

function drawHintArrows(ctx, path) {
  if (!path || path.length < 12) return;

  ctx.save();

  const indices = [10, Math.floor(path.length * 0.42), Math.floor(path.length * 0.74)];

  for (const index of indices) {
    const prev = path[Math.max(0, index - 2)];
    const current = path[index];
    const next = path[Math.min(path.length - 1, index + 2)];

    if (!prev || !current || !next) continue;

    const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
    drawArrow(ctx, current.x, current.y, angle);
  }

  ctx.restore();
}

function drawArrow(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = "rgba(123, 156, 255, 0.46)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-16, -8);
  ctx.lineTo(-16, 8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/* =========================================================
   HELPERS DE DIBUJO
========================================================= */

function drawRoundedPolyline(
  ctx,
  points,
  lineWidth,
  strokeStyle,
  lineCap = "round",
  lineJoin = "round"
) {
  if (!points || points.length < 2) return;

  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.lineCap = lineCap;
  ctx.lineJoin = lineJoin;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
  ctx.restore();
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function getPathBounds(path, padding = 0) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of path) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding
  };
}

/* =========================================================
   SUAVIZADO / LONGITUD
========================================================= */

export function smoothPath(path, iterations = 2) {
  if (!Array.isArray(path) || path.length < 3) {
    return Array.isArray(path) ? [...path] : [];
  }

  let current = [...path];

  for (let k = 0; k < iterations; k += 1) {
    const smoothed = [current[0]];

    for (let i = 1; i < current.length - 1; i += 1) {
      const prev = current[i - 1];
      const curr = current[i];
      const next = current[i + 1];

      smoothed.push({
        x: (prev.x + curr.x + next.x) / 3,
        y: (prev.y + curr.y + next.y) / 3
      });
    }

    smoothed.push(current[current.length - 1]);
    current = smoothed;
  }

  return current;
}

export function getPathLength(path) {
  if (!Array.isArray(path) || path.length < 2) return 0;

  let total = 0;

  for (let i = 1; i < path.length; i += 1) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    total += Math.hypot(dx, dy);
  }

  return total;
}