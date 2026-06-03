(() => {
  'use strict';

  const BASE_WIDTH = 1280;
  const BASE_HEIGHT = 720;
  const STORAGE_KEY = 'musicala_linea_perfecta_glowup_v2';
  const BEST_KEY = 'musicala_linea_perfecta_best_accuracy_v2';

  const $ = (selector) => document.querySelector(selector);

  const canvas = $('#game-canvas');
  const ctx = canvas.getContext('2d', { alpha: true });

  const els = {
    hudLevel: $('#hud-level'),
    hudScore: $('#hud-score'),
    hudAccuracy: $('#hud-accuracy'),
    hudBest: $('#hud-best'),
    hudTime: $('#hud-time'),
    hudError: $('#hud-error'),
    hudFlow: $('#hud-flow'),
    levelName: $('#level-name'),
    missionText: $('#mission-text'),
    roundLabel: $('#round-label'),
    keywordValue: $('#keyword-value'),
    progressDots: $('#progress-dots'),
    statusPill: $('#status-pill'),
    statusDot: $('#status-dot'),
    statusText: $('#status-text'),
    feedbackBar: $('#feedback-bar'),
    feedbackText: $('#feedback-text'),
    musiText: $('#musi-text'),
    resultGrade: $('#result-grade'),
    resultStars: $('#result-stars'),
    resultAccuracy: $('#result-accuracy'),
    resultControl: $('#result-control'),
    resultFlow: $('#result-flow'),
    gradeLabel: $('#grade-label'),
    meterAccuracy: $('#meter-accuracy'),
    meterControl: $('#meter-control'),
    meterFlow: $('#meter-flow'),
    startOverlay: $('#start-overlay'),
    btnStart: $('#btn-start'),
    btnClear: $('#btn-clear'),
    btnRestart: $('#btn-restart'),
    btnNext: $('#btn-next'),
    btnPractice: $('#btn-practice'),
    btnResetProgress: $('#btn-reset-progress'),
    modal: $('#result-modal'),
    modalBadge: $('#modal-badge'),
    modalTitle: $('#modal-title'),
    modalMessage: $('#modal-message'),
    modalScore: $('#modal-score'),
    modalAccuracy: $('#modal-accuracy'),
    modalStars: $('#modal-stars'),
    modalKeyword: $('#modal-keyword'),
    btnRetryModal: $('#btn-retry-modal'),
    btnContinueModal: $('#btn-continue-modal'),
    btnCloseModal: $('#btn-close-modal'),
    toast: $('#toast')
  };

  function point(x, y) {
    return { x, y };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function linePath(start, end, segments = 90) {
    const path = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      path.push(point(lerp(start.x, end.x, t), lerp(start.y, end.y, t)));
    }
    return path;
  }

  function quadraticPath(start, control, end, segments = 110) {
    const path = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const nt = 1 - t;
      path.push(point(
        nt * nt * start.x + 2 * nt * t * control.x + t * t * end.x,
        nt * nt * start.y + 2 * nt * t * control.y + t * t * end.y
      ));
    }
    return path;
  }

  function cubicPath(start, c1, c2, end, segments = 140) {
    const path = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const nt = 1 - t;
      path.push(point(
        nt ** 3 * start.x + 3 * nt ** 2 * t * c1.x + 3 * nt * t ** 2 * c2.x + t ** 3 * end.x,
        nt ** 3 * start.y + 3 * nt ** 2 * t * c1.y + 3 * nt * t ** 2 * c2.y + t ** 3 * end.y
      ));
    }
    return path;
  }

  function wavePath({ startX, endX, centerY, amplitude, waves, segments = 150 }) {
    const path = [];
    const width = endX - startX;
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      path.push(point(startX + width * t, centerY + Math.sin(t * Math.PI * 2 * waves) * amplitude));
    }
    return path;
  }

  function zigzagPath({ startX, endX, centerY, amplitude, peaks, segments = 150 }) {
    const corners = [];
    for (let i = 0; i <= peaks; i += 1) {
      const t = i / peaks;
      corners.push(point(startX + (endX - startX) * t, i % 2 === 0 ? centerY - amplitude : centerY + amplitude));
    }
    return densifyPolyline(corners, segments);
  }

  function loopPath({ start, loopCenter, loopRadius, end, segmentsLine = 50, segmentsLoop = 140 }) {
    const entry = linePath(start, point(loopCenter.x - loopRadius, loopCenter.y), segmentsLine);
    const loop = [];
    for (let i = 0; i <= segmentsLoop; i += 1) {
      const t = i / segmentsLoop;
      const angle = Math.PI + t * Math.PI * 2;
      loop.push(point(loopCenter.x + Math.cos(angle) * loopRadius, loopCenter.y + Math.sin(angle) * loopRadius));
    }
    const exit = linePath(loop[loop.length - 1], end, segmentsLine);
    return [...entry, ...loop, ...exit];
  }

  function spiralPath({ centerX, centerY, startRadius, endRadius, turns, segments = 220 }) {
    const path = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const angle = turns * Math.PI * 2 * t;
      const radius = lerp(startRadius, endRadius, t);
      path.push(point(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius));
    }
    return path;
  }


  function catmullRomPath(points, segmentsPerSection = 32) {
    if (!points || points.length < 2) return points ? [...points] : [];
    const path = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      for (let j = 0; j < segmentsPerSection; j += 1) {
        const t = j / segmentsPerSection;
        const t2 = t * t;
        const t3 = t2 * t;
        const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
        path.push(point(x, y));
      }
    }
    path.push(points[points.length - 1]);
    return path;
  }

  function heartPath({ centerX, centerY, scale = 18, segments = 220 }) {
    const raw = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = Math.PI * 2 * (i / segments);
      const x = 16 * Math.sin(t) ** 3;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      raw.push(point(centerX + x * scale, centerY + y * scale));
    }
    // Rotamos el inicio para que el punto inicial quede abajo a la izquierda y sea más natural.
    const startIndex = Math.floor(raw.length * 0.44);
    return [...raw.slice(startIndex), ...raw.slice(0, startIndex + 1)];
  }

  function densifyPolyline(points, segments = 120) {
    if (!points || points.length < 2) return points ? [...points] : [];
    const totalLength = getPathLength(points);
    if (!totalLength) return [...points];

    const out = [points[0]];
    let distanceTarget = totalLength / segments;
    let accumulated = 0;

    for (let i = 1; i < points.length; i += 1) {
      const previous = points[i - 1];
      const current = points[i];
      const sectionLength = distance(previous, current);

      while (accumulated + sectionLength >= distanceTarget) {
        const localT = (distanceTarget - accumulated) / sectionLength;
        out.push(point(lerp(previous.x, current.x, localT), lerp(previous.y, current.y, localT)));
        distanceTarget += totalLength / segments;
      }
      accumulated += sectionLength;
    }

    out.push(points[points.length - 1]);
    return out;
  }

  function createLevel(config) {
    const path = config.path;
    return {
      ...config,
      path,
      start: path[0],
      end: path[path.length - 1],
      startRadius: config.startRadius || 42,
      endRadius: config.endRadius || 44,
      allowedError: config.allowedError || 32,
      expectedMs: config.expectedMs || 7000
    };
  }

  const LEVELS = [
    createLevel({
      id: 1,
      name: 'Pulso inicial',
      keyword: 'TRAZO',
      mission: 'Sigue una línea recta estable. Fácil, hasta que el pulso decide tener vida propia.',
      musi: 'Suave. Mano relajada, mirada al punto final y nada de carreras absurdas.',
      expectedMs: 4200,
      allowedError: 34,
      path: linePath(point(190, 360), point(1090, 360), 100)
    }),
    createLevel({
      id: 2,
      name: 'Arco suave',
      keyword: 'CURVA',
      mission: 'Traza una curva amplia sin cortar camino. La línea quiere elegancia, no atajos raros.',
      musi: 'Piensa en una pincelada larga. Menos tensión, más recorrido.',
      expectedMs: 5400,
      allowedError: 36,
      path: quadraticPath(point(170, 500), point(650, 160), point(1110, 500), 130)
    }),
    createLevel({
      id: 3,
      name: 'Onda musical',
      keyword: 'RITMO',
      mission: 'Sigue la onda manteniendo ritmo visual. Aquí el trazo tiene que cantar un poquito.',
      musi: 'No persigas la línea, acompáñala. Sí, suena poético. No me culpen, es arte.',
      expectedMs: 6500,
      allowedError: 38,
      path: wavePath({ startX: 150, endX: 1130, centerY: 360, amplitude: 86, waves: 2.5, segments: 170 })
    }),
    createLevel({
      id: 4,
      name: 'Picos andinos',
      keyword: 'MONTE',
      mission: 'Resuelve cambios de dirección sin salirte del camino. Precisión y decisión, qué concepto tan extravagante.',
      musi: 'En cada esquina baja la velocidad. El mouse no tiene que derrapar.',
      expectedMs: 7200,
      allowedError: 42,
      path: zigzagPath({ startX: 170, endX: 1110, centerY: 360, amplitude: 118, peaks: 7, segments: 160 })
    }),
    createLevel({
      id: 5,
      name: 'Sendero orgánico',
      keyword: 'FLUJO',
      mission: 'Sigue una forma viva y asimétrica. Mantén control aunque el recorrido se ponga dramático.',
      musi: 'Mira la forma completa antes de salir. Improvisar sin mirar es deporte extremo.',
      expectedMs: 7800,
      allowedError: 42,
      path: cubicPath(point(170, 530), point(360, 160), point(825, 620), point(1100, 250), 170)
    }),
    createLevel({
      id: 6,
      name: 'Bucle mágico',
      keyword: 'GIRO',
      mission: 'Entra al bucle, completa la vuelta y sal con control. El caos circular no cuenta como estilo.',
      musi: 'Cuando cierres la vuelta, sigue el camino de salida. No te quedes atrapado en el drama geométrico.',
      expectedMs: 8500,
      allowedError: 46,
      path: loopPath({ start: point(160, 360), loopCenter: point(560, 360), loopRadius: 130, end: point(1080, 360), segmentsLine: 60, segmentsLoop: 150 })
    }),
    createLevel({
      id: 7,
      name: 'Espiral final',
      keyword: 'ARTE',
      mission: 'Cierra la espiral con paciencia y precisión. El centro no se conquista a punta de ansiedad.',
      musi: 'Respira antes de entrar. Este nivel premia paciencia, esa cosa antigua que casi nadie actualiza.',
      expectedMs: 9600,
      allowedError: 48,
      path: spiralPath({ centerX: 640, centerY: 360, startRadius: 230, endRadius: 38, turns: 2.6, segments: 240 })
    }),
    createLevel({
      id: 8,
      name: 'Firma Musicala',
      keyword: 'CREA',
      mission: 'Traza una firma artística completa con fluidez. El cierre pide precisión, intención y un poquito de dignidad digital.',
      musi: 'Este es de cierre bonito. Concentración, Recursos, Exploración y Adaptabilidad. CREA en acción.',
      expectedMs: 9800,
      allowedError: 50,
      startRadius: 48,
      endRadius: 48,
      path: catmullRomPath([
        point(170, 500), point(300, 255), point(470, 470), point(620, 260),
        point(770, 505), point(950, 335), point(1110, 470)
      ], 38)
    })
  ];

  const state = {
    levelIndex: 0,
    playing: false,
    drawing: false,
    completed: false,
    practice: false,
    trail: [],
    smoothTrail: [],
    score: 0,
    lastResult: null,
    startedAt: 0,
    elapsedMs: 0,
    bestAccuracy: null,
    completedLevels: 0,
    pointerId: null,
    staticCanvas: null,
    staticLevelId: null,
    staticWidth: 0,
    staticHeight: 0,
    toastTimer: null
  };

  let drawPending = false;

  init();

  function init() {
    loadProgress();
    bindEvents();
    resizeCanvas();
    prepareLevel(state.levelIndex);
    window.requestAnimationFrame(draw);
  }

  function bindEvents() {
    window.addEventListener('resize', () => {
      resizeCanvas();
      invalidateStaticLayer();
      requestDraw();
    });

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(() => {
        resizeCanvas();
        invalidateStaticLayer();
        requestDraw();
      });
      observer.observe(canvas);
    }

    els.btnStart.addEventListener('click', startLevel);
    els.btnClear.addEventListener('click', clearTrail);
    els.btnRestart.addEventListener('click', restartLevel);
    els.btnNext.addEventListener('click', nextLevel);
    els.btnPractice.addEventListener('click', togglePracticeMode);
    els.btnResetProgress.addEventListener('click', resetProgress);
    els.btnRetryModal.addEventListener('click', () => {
      closeModal();
      restartLevel();
    });
    els.btnContinueModal.addEventListener('click', () => {
      closeModal();
      nextLevel();
    });
    els.btnCloseModal.addEventListener('click', closeModal);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        if (!state.playing && !state.completed) startLevel();
      }
      if (event.key.toLowerCase() === 'r') restartLevel();
    });

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: false });
    window.addEventListener('pointercancel', onPointerUp, { passive: false });
  }

  function loadProgress() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      state.score = Number.isFinite(stored.score) ? stored.score : 0;
      state.completedLevels = Number.isFinite(stored.completedLevels) ? stored.completedLevels : 0;
      state.levelIndex = Number.isFinite(stored.levelIndex) ? Math.min(stored.levelIndex, LEVELS.length - 1) : 0;
      const best = Number(localStorage.getItem(BEST_KEY));
      state.bestAccuracy = Number.isFinite(best) && best > 0 ? best : null;
    } catch (error) {
      state.score = 0;
      state.completedLevels = 0;
      state.levelIndex = 0;
      state.bestAccuracy = null;
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        score: state.score,
        completedLevels: state.completedLevels,
        levelIndex: state.levelIndex
      }));
      if (state.bestAccuracy !== null) {
        localStorage.setItem(BEST_KEY, String(state.bestAccuracy));
      }
    } catch (error) {
      // Si el navegador bloquea localStorage, el juego sigue vivo. Pequeña victoria civilizatoria.
    }
  }

  function resetProgress() {
    state.score = 0;
    state.completedLevels = 0;
    state.levelIndex = 0;
    state.bestAccuracy = null;
    state.lastResult = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BEST_KEY);
    } catch (error) {}
    prepareLevel(0);
    showToast('Progreso borrado. Empezamos limpios, como promesa de lunes.');
  }

  function prepareLevel(index) {
    state.levelIndex = clamp(index, 0, LEVELS.length - 1);
    state.playing = false;
    state.drawing = false;
    state.completed = false;
    state.trail = [];
    state.smoothTrail = [];
    state.lastResult = null;
    state.startedAt = 0;
    state.elapsedMs = 0;
    state.pointerId = null;
    invalidateStaticLayer();
    hideOverlay(false);
    closeModal();
    setButton(els.btnNext, true);
    setStatus('idle', 'Listo para iniciar');
    updateUI();
    requestDraw();
  }

  function startLevel() {
    state.playing = true;
    state.drawing = false;
    state.completed = false;
    state.trail = [];
    state.smoothTrail = [];
    state.lastResult = null;
    state.startedAt = performance.now();
    state.elapsedMs = 0;
    state.pointerId = null;
    hideOverlay(true);
    setButton(els.btnNext, true);
    setStatus('playing', 'Busca el punto de inicio');
    setFeedback('Toca el punto verde y sigue el recorrido. Nada de inventar rutas turísticas.');
    updateUI();
    tickTimer();
    requestDraw();
  }

  function restartLevel() {
    state.playing = false;
    state.drawing = false;
    state.completed = false;
    state.trail = [];
    state.smoothTrail = [];
    state.lastResult = null;
    state.startedAt = 0;
    state.elapsedMs = 0;
    state.pointerId = null;
    hideOverlay(false);
    closeModal();
    setButton(els.btnNext, true);
    setStatus('idle', 'Nivel reiniciado');
    setFeedback('Nivel reiniciado. Respira y vuelve a comenzar con una pizca menos de caos.');
    updateUI();
    requestDraw();
  }

  function clearTrail() {
    if (!state.playing && !state.trail.length) return;
    state.trail = [];
    state.smoothTrail = [];
    state.drawing = false;
    state.completed = false;
    setButton(els.btnNext, true);
    setStatus(state.playing ? 'playing' : 'idle', state.playing ? 'Trazo limpio' : 'Listo para iniciar');
    setFeedback('Trazo limpiado. El lienzo perdona, una rareza en este mundo.');
    updateUI();
    requestDraw();
  }

  function nextLevel() {
    closeModal();
    if (state.levelIndex >= LEVELS.length - 1) {
      setStatus('idle', 'Juego completado');
      setFeedback(`Completaste todos los niveles con ${state.score} puntos. Musi está orgulloso y yo, ligeramente menos decepcionado.`);
      setButton(els.btnNext, true);
      hideOverlay(false);
      els.btnStart.textContent = 'Jugar otra vez';
      state.levelIndex = 0;
      state.completedLevels = LEVELS.length;
      saveProgress();
      updateUI();
      return;
    }
    prepareLevel(state.levelIndex + 1);
    saveProgress();
  }

  function togglePracticeMode() {
    state.practice = !state.practice;
    els.btnPractice.textContent = `Modo práctica: ${state.practice ? 'ON' : 'OFF'}`;
    els.btnPractice.setAttribute('aria-pressed', String(state.practice));
    showToast(state.practice ? 'Modo práctica activado: guía más generosa y sin presión.' : 'Modo práctica desactivado: volvemos al juicio del trazo.');
    requestDraw();
  }

  function onPointerDown(event) {
    if (!state.playing || state.completed) return;
    event.preventDefault();

    const level = currentLevel();
    const p = pointerToBase(event);
    const resumeAllowed = state.trail.length > 2 && distance(p, state.trail[state.trail.length - 1]) <= 62;
    const startAllowed = distance(p, level.start) <= (level.startRadius + (state.practice ? 32 : 16));

    if (!startAllowed && !resumeAllowed) {
      const message = state.trail.length
        ? 'Para continuar, toca cerca del último punto naranja. Si no, limpia el trazo y arranca de nuevo.'
        : 'Empieza desde el punto verde. El freestyle lo dejamos para cuando la guía no esté mirando.';
      setStatus('error', state.trail.length ? 'Continúa desde tu trazo' : 'Inicio incorrecto');
      setFeedback(message);
      requestDraw();
      return;
    }

    state.pointerId = event.pointerId;
    state.drawing = true;
    canvas.setPointerCapture?.(event.pointerId);

    if (!resumeAllowed) {
      state.trail = [p];
      state.smoothTrail = [p];
    } else {
      state.trail.push(p);
      state.smoothTrail = smoothPath(state.trail, 2);
    }

    setStatus('playing', resumeAllowed ? 'Continuando trazo' : 'Trazando');
    setFeedback(resumeAllowed ? 'Bien, retomaste el trazo. Sigue hasta el final.' : 'Buen inicio. Ahora sigue la guía con calma.');
    requestDraw();
  }

  function onPointerMove(event) {
    if (!state.playing || !state.drawing || state.completed) return;
    if (state.pointerId !== null && event.pointerId !== state.pointerId) return;
    event.preventDefault();

    const p = pointerToBase(event);
    const last = state.trail[state.trail.length - 1];
    if (!last || distance(last, p) >= 1.4) {
      state.trail.push(p);
      state.smoothTrail = smoothPath(state.trail, 2);
    }

    const live = getLiveEvaluation(state.smoothTrail.length ? state.smoothTrail : state.trail, currentLevel());
    updateLiveHud(live);

    if (distance(p, currentLevel().end) <= (currentLevel().endRadius + (state.practice ? 32 : 14)) && state.trail.length > 12) {
      finishAttempt();
      return;
    }

    requestDraw();
  }

  function onPointerUp(event) {
    if (!state.playing || !state.drawing || state.completed) return;
    if (state.pointerId !== null && event.pointerId !== state.pointerId) return;
    event.preventDefault();

    state.drawing = false;
    canvas.releasePointerCapture?.(event.pointerId);
    state.pointerId = null;

    const last = state.trail[state.trail.length - 1];
    if (last && distance(last, currentLevel().end) <= (currentLevel().endRadius + (state.practice ? 32 : 14))) {
      finishAttempt();
      return;
    }

    setStatus('warning', 'Trazo pausado');
    setFeedback('Soltaste antes del final. Puedes continuar desde el último punto naranja o limpiar el trazo. Mira, hasta esto tiene segundas oportunidades.');
    requestDraw();
  }

  function finishAttempt() {
    state.drawing = false;
    state.playing = false;
    state.completed = true;
    state.elapsedMs = state.startedAt ? performance.now() - state.startedAt : state.elapsedMs;
    state.pointerId = null;

    const finalPath = smoothPath(state.trail, 3);
    const result = scoreAttempt(finalPath, currentLevel(), state.elapsedMs, state.practice);
    state.trail = finalPath;
    state.smoothTrail = finalPath;
    state.lastResult = result;
    state.score += result.score;
    state.completedLevels = Math.max(state.completedLevels, state.levelIndex + 1);

    if (state.bestAccuracy === null || result.accuracy > state.bestAccuracy) {
      state.bestAccuracy = result.accuracy;
    }

    saveProgress();
    setStatus('idle', 'Nivel completado');
    setFeedback(result.feedback);
    setButton(els.btnNext, false);
    updateUI();
    openModal(result);
    requestDraw();
  }

  function scoreAttempt(userPath, level, elapsedMs, practiceMode) {
    if (!userPath || userPath.length < 2) return emptyResult(level);

    const allowedError = level.allowedError + (practiceMode ? 18 : 0);
    const samples = resamplePath(userPath, 160);
    const targetLength = getPathLength(level.path);
    const userLength = getPathLength(userPath);

    let totalError = 0;
    let maxError = 0;
    let inside = 0;
    let progress = 0;

    for (const p of samples) {
      const nearest = nearestOnPath(p, level.path);
      totalError += nearest.distance;
      maxError = Math.max(maxError, nearest.distance);
      if (nearest.distance <= allowedError) inside += 1;
      progress = Math.max(progress, nearest.progress);
    }

    const avgError = totalError / samples.length;
    const insideRatio = inside / samples.length;
    const progressScore = clamp(progress * 100, 0, 100);
    const errorScore = clamp(100 - (avgError / allowedError) * 72, 0, 100);
    const insideScore = insideRatio * 100;
    const startScore = clamp(100 - (distance(userPath[0], level.start) / (level.startRadius + 40)) * 100, 0, 100);
    const endScore = clamp(100 - (distance(userPath[userPath.length - 1], level.end) / (level.endRadius + 40)) * 100, 0, 100);
    const lengthScore = clamp(100 - Math.abs(1 - (userLength / targetLength)) * 78, 0, 100);
    const flow = computeFlow(userPath);
    const tempo = computeTempo(elapsedMs, level.expectedMs);

    const control = clamp(errorScore * 0.5 + insideScore * 0.28 + lengthScore * 0.14 + flow * 0.08, 0, 100);
    const accuracy = clamp(
      errorScore * 0.38 +
      insideScore * 0.22 +
      progressScore * 0.16 +
      startScore * 0.08 +
      endScore * 0.08 +
      flow * 0.05 +
      tempo * 0.03,
      0,
      100
    );

    const roundedAccuracy = Math.round(accuracy);
    const roundedControl = Math.round(control);
    const roundedFlow = Math.round(flow);
    const grade = gradeFromAccuracy(roundedAccuracy);
    const stars = starsFromAccuracy(roundedAccuracy);
    const score = Math.max(0, Math.round((accuracy * 9) + (control * 1.2) + (flow * 0.8) + stars * 120));

    return {
      levelId: level.id,
      levelName: level.name,
      keyword: level.keyword,
      score,
      grade,
      stars,
      accuracy: roundedAccuracy,
      control: roundedControl,
      flow: roundedFlow,
      tempo: Math.round(tempo),
      avgError: Math.round(avgError),
      maxError: Math.round(maxError),
      completion: Math.round(progressScore),
      elapsedMs: Math.round(elapsedMs),
      feedback: buildFeedback(roundedAccuracy, roundedControl, roundedFlow, Math.round(progressScore))
    };
  }

  function emptyResult(level) {
    return {
      levelId: level.id,
      levelName: level.name,
      keyword: level.keyword,
      score: 0,
      grade: 'D',
      stars: 0,
      accuracy: 0,
      control: 0,
      flow: 0,
      tempo: 0,
      avgError: 0,
      maxError: 0,
      completion: 0,
      elapsedMs: 0,
      feedback: 'No hubo suficiente trazo para evaluar. La línea no puede leer mentes todavía.'
    };
  }

  function getLiveEvaluation(path, level) {
    if (!path || path.length < 2) {
      return { error: 0, flow: 0, message: 'Empieza desde el punto verde.', status: 'playing', label: 'Trazando' };
    }
    const recent = path.slice(Math.max(0, path.length - 22));
    const allowed = level.allowedError + (state.practice ? 18 : 0);
    const avg = recent.reduce((sum, p) => sum + nearestOnPath(p, level.path).distance, 0) / recent.length;
    const flow = computeFlow(recent);

    if (avg <= allowed * 0.58) {
      return { error: Math.round(avg), flow: Math.round(flow), message: 'Vas muy bien. Pulso fino, casi ofensivamente organizado.', status: 'playing', label: 'Muy preciso' };
    }
    if (avg <= allowed * 1.05) {
      return { error: Math.round(avg), flow: Math.round(flow), message: 'Buen camino. Ajusta un poquito hacia la guía.', status: 'playing', label: 'Buen control' };
    }
    return { error: Math.round(avg), flow: Math.round(flow), message: 'Te estás saliendo. Corrige antes de que la obra vire a garabato conceptual.', status: 'error', label: 'Desviado' };
  }

  function updateLiveHud(live) {
    setText(els.hudError, String(live.error));
    setText(els.hudFlow, `${live.flow}%`);
    setStatus(live.status, live.label);
    setFeedback(live.message, false);
  }

  function buildFeedback(accuracy, control, flow, completion) {
    if (completion < 85) return 'Llegaste al final, pero el recorrido quedó incompleto. Hay intención, que es lo que uno dice cuando toca ser amable.';
    if (accuracy >= 94 && flow >= 82) return 'Trazo hermoso: preciso, limpio y fluido. Musi acaba de hacer una venia imaginaria.';
    if (accuracy >= 86) return 'Excelente trazo. Muy buen control y una ruta clara de inicio a fin.';
    if (accuracy >= 74) {
      if (flow < 55) return 'Muy bien, aunque el movimiento estuvo algo tembloroso. Menos tensión y queda más suave.';
      return 'Muy buen intento. La forma se entiende y el control va por buen camino.';
    }
    if (accuracy >= 58) {
      if (control < 55) return 'Buen intento. Te acercaste, pero hubo varias salidas del camino. Baja velocidad y mira el siguiente tramo.';
      return 'La base está. Falta más precisión para que el trazo no parezca perseguido por deudas.';
    }
    return 'Ese trazo quedó bastante salvaje. Respira, mira la ruta completa y vuelve a intentarlo con calma.';
  }

  function gradeFromAccuracy(accuracy) {
    if (accuracy >= 96) return 'S';
    if (accuracy >= 88) return 'A';
    if (accuracy >= 76) return 'B';
    if (accuracy >= 62) return 'C';
    return 'D';
  }

  function starsFromAccuracy(accuracy) {
    if (accuracy >= 90) return 3;
    if (accuracy >= 74) return 2;
    if (accuracy >= 56) return 1;
    return 0;
  }

  function computeTempo(elapsedMs, expectedMs) {
    if (!elapsedMs || elapsedMs < 800) return 35;
    const ratio = elapsedMs / expectedMs;
    const deviation = Math.abs(1 - ratio);
    return clamp(100 - deviation * 75, 25, 100);
  }

  function computeFlow(path) {
    if (!path || path.length < 4) return 0;
    let totalTurn = 0;
    let count = 0;
    for (let i = 2; i < path.length - 2; i += 1) {
      const a = path[i - 2];
      const b = path[i];
      const c = path[i + 2];
      const angle1 = Math.atan2(b.y - a.y, b.x - a.x);
      const angle2 = Math.atan2(c.y - b.y, c.x - b.x);
      let turn = Math.abs(angle2 - angle1);
      if (turn > Math.PI) turn = Math.PI * 2 - turn;
      totalTurn += turn;
      count += 1;
    }
    const avgTurn = count ? totalTurn / count : Math.PI;
    return clamp(100 - (avgTurn / Math.PI) * 118, 0, 100);
  }

  function nearestOnPath(p, path) {
    let bestDistance = Infinity;
    let bestProgressLength = 0;
    let travelled = 0;
    const total = getPathLength(path) || 1;

    for (let i = 1; i < path.length; i += 1) {
      const a = path[i - 1];
      const b = path[i];
      const segLength = distance(a, b);
      const projected = projectPointOnSegment(p, a, b);
      if (projected.distance < bestDistance) {
        bestDistance = projected.distance;
        bestProgressLength = travelled + projected.t * segLength;
      }
      travelled += segLength;
    }

    return {
      distance: bestDistance,
      progress: clamp(bestProgressLength / total, 0, 1)
    };
  }

  function projectPointOnSegment(p, a, b) {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const wx = p.x - a.x;
    const wy = p.y - a.y;
    const lengthSq = vx * vx + vy * vy;
    const t = lengthSq ? clamp((wx * vx + wy * vy) / lengthSq, 0, 1) : 0;
    const x = a.x + vx * t;
    const y = a.y + vy * t;
    return { x, y, t, distance: Math.hypot(p.x - x, p.y - y) };
  }

  function resamplePath(path, targetCount = 120) {
    if (!path || !path.length) return [];
    if (path.length === 1) return Array.from({ length: targetCount }, () => ({ ...path[0] }));
    const total = getPathLength(path);
    if (!total) return [...path];

    const out = [];
    let segmentIndex = 1;
    let travelledBefore = 0;

    for (let i = 0; i < targetCount; i += 1) {
      const targetDistance = (total * i) / (targetCount - 1);
      while (segmentIndex < path.length - 1) {
        const segmentLength = distance(path[segmentIndex - 1], path[segmentIndex]);
        if (travelledBefore + segmentLength >= targetDistance) break;
        travelledBefore += segmentLength;
        segmentIndex += 1;
      }

      const a = path[segmentIndex - 1];
      const b = path[segmentIndex];
      const sectionLength = distance(a, b) || 1;
      const t = clamp((targetDistance - travelledBefore) / sectionLength, 0, 1);
      out.push(point(lerp(a.x, b.x, t), lerp(a.y, b.y, t)));
    }

    return out;
  }

  function smoothPath(path, iterations = 2) {
    if (!path || path.length < 3) return path ? [...path] : [];
    let current = [...path];
    for (let step = 0; step < iterations; step += 1) {
      const next = [current[0]];
      for (let i = 1; i < current.length - 1; i += 1) {
        const prev = current[i - 1];
        const curr = current[i];
        const after = current[i + 1];
        next.push(point(
          prev.x * 0.25 + curr.x * 0.5 + after.x * 0.25,
          prev.y * 0.25 + curr.y * 0.5 + after.y * 0.25
        ));
      }
      next.push(current[current.length - 1]);
      current = next;
    }
    return current;
  }

  function getPathLength(path) {
    if (!path || path.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < path.length; i += 1) total += distance(path[i - 1], path[i]);
    return total;
  }

  function currentLevel() {
    return LEVELS[state.levelIndex];
  }

  function updateUI() {
    const level = currentLevel();
    setText(els.hudLevel, `${state.levelIndex + 1}/${LEVELS.length}`);
    setText(els.hudScore, String(state.score));
    setText(els.hudAccuracy, state.lastResult ? `${state.lastResult.accuracy}%` : '0%');
    setText(els.hudBest, state.bestAccuracy !== null ? `${Math.round(state.bestAccuracy)}%` : '--');
    setText(els.hudTime, formatTime(state.elapsedMs));
    setText(els.hudError, state.lastResult ? String(state.lastResult.avgError) : '0');
    setText(els.hudFlow, state.lastResult ? `${state.lastResult.flow}%` : '0%');
    setText(els.levelName, level.name);
    setText(els.missionText, level.mission);
    setText(els.roundLabel, `Ronda ${state.levelIndex + 1}`);
    setText(els.keywordValue, level.keyword);
    setText(els.musiText, level.musi);
    els.btnStart.textContent = state.levelIndex === 0 && state.completedLevels >= LEVELS.length ? 'Jugar otra vez' : 'Comenzar';
    renderProgressDots();
    renderResult(state.lastResult);
  }

  function renderProgressDots() {
    els.progressDots.innerHTML = '';
    LEVELS.forEach((level, index) => {
      const dot = document.createElement('span');
      dot.className = 'progress-dot';
      dot.textContent = String(index + 1);
      dot.title = level.name;
      if (index < state.completedLevels) dot.classList.add('done');
      if (index === state.levelIndex) dot.classList.add('active');
      els.progressDots.appendChild(dot);
    });
  }

  function renderResult(result) {
    const grade = result ? result.grade : '--';
    const stars = result ? result.stars : 0;
    const accuracy = result ? result.accuracy : 0;
    const control = result ? result.control : 0;
    const flow = result ? result.flow : 0;

    setText(els.resultGrade, grade);
    setText(els.gradeLabel, result ? titleForGrade(grade) : '--');
    setText(els.resultStars, starString(stars, true));
    setText(els.resultAccuracy, `${accuracy}%`);
    setText(els.resultControl, `${control}%`);
    setText(els.resultFlow, `${flow}%`);
    els.meterAccuracy.style.width = `${accuracy}%`;
    els.meterControl.style.width = `${control}%`;
    els.meterFlow.style.width = `${flow}%`;
  }

  function titleForGrade(grade) {
    switch (grade) {
      case 'S': return 'Perfecto';
      case 'A': return 'Excelente';
      case 'B': return 'Muy bien';
      case 'C': return 'En proceso';
      default: return 'A practicar';
    }
  }

  function openModal(result) {
    setText(els.modalBadge, result.stars === 3 ? 'Nivel dominado' : 'Nivel completado');
    setText(els.modalTitle, titleForGrade(result.grade));
    setText(els.modalMessage, result.feedback);
    setText(els.modalScore, String(result.score));
    setText(els.modalAccuracy, `${result.accuracy}%`);
    setText(els.modalStars, starString(result.stars, false));
    setText(els.modalKeyword, result.keyword);
    els.modal.classList.remove('hidden');
    els.modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    els.modal.classList.add('hidden');
    els.modal.setAttribute('aria-hidden', 'true');
  }

  function setStatus(type, text) {
    els.statusPill.classList.remove('playing', 'warning', 'error');
    if (type && type !== 'idle') els.statusPill.classList.add(type);
    setText(els.statusText, text);
  }

  function setFeedback(text, pulse = true) {
    setText(els.feedbackText, text);
    if (!pulse) return;
    els.feedbackBar.classList.remove('pulse');
    void els.feedbackBar.offsetWidth;
    els.feedbackBar.classList.add('pulse');
  }

  function setText(element, value) {
    if (element) element.textContent = value ?? '';
  }

  function setButton(button, disabled) {
    button.disabled = Boolean(disabled);
    button.setAttribute('aria-disabled', String(Boolean(disabled)));
  }

  function hideOverlay(hidden) {
    els.startOverlay.classList.toggle('hidden', hidden);
  }

  function tickTimer() {
    if (!state.playing || !state.startedAt) return;
    state.elapsedMs = performance.now() - state.startedAt;
    setText(els.hudTime, formatTime(state.elapsedMs));
    window.requestAnimationFrame(tickTimer);
  }

  function requestDraw() {
    if (drawPending) return;
    drawPending = true;
    window.requestAnimationFrame(() => {
      drawPending = false;
      draw();
    });
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      invalidateStaticLayer();
    }
  }

  function pointerToBase(event) {
    const rect = canvas.getBoundingClientRect();
    return point(
      ((event.clientX - rect.left) / rect.width) * BASE_WIDTH,
      ((event.clientY - rect.top) / rect.height) * BASE_HEIGHT
    );
  }

  function draw() {
    resizeCanvas();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(getStaticLayer(), 0, 0);
    applyBaseTransform(ctx);

    const level = currentLevel();
    if (state.practice) drawPracticeCorridor(ctx, level.path, level.allowedError + 18);

    const path = state.smoothTrail.length ? state.smoothTrail : state.trail;
    if (path.length > 0) {
      drawUserPath(ctx, path, state.lastResult?.accuracy >= 82 ? '#43bf81' : '#ff8a5c');
      drawTrailDots(ctx, path);
      drawCurrentPoint(ctx, path[path.length - 1]);
    }

    if (!state.playing && !state.trail.length) drawGuideArrows(ctx, level.path);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function getStaticLayer() {
    const level = currentLevel();
    const valid = state.staticCanvas &&
      state.staticLevelId === level.id &&
      state.staticWidth === canvas.width &&
      state.staticHeight === canvas.height;

    if (valid) return state.staticCanvas;

    const layer = document.createElement('canvas');
    layer.width = canvas.width;
    layer.height = canvas.height;
    const layerCtx = layer.getContext('2d');
    applyBaseTransform(layerCtx);
    drawCanvasBackground(layerCtx);
    drawDecor(layerCtx);
    drawGuidePanel(layerCtx, level.path);
    drawPracticeCorridor(layerCtx, level.path, level.allowedError);
    drawGuidePath(layerCtx, level.path);
    drawPointMarker(layerCtx, level.start, level.startRadius, '#66ca92', 'INICIO');
    drawPointMarker(layerCtx, level.end, level.endRadius, '#ff93c1', 'FIN');
    drawFrame(layerCtx);

    state.staticCanvas = layer;
    state.staticLevelId = level.id;
    state.staticWidth = canvas.width;
    state.staticHeight = canvas.height;
    return layer;
  }

  function invalidateStaticLayer() {
    state.staticCanvas = null;
    state.staticLevelId = null;
  }

  function applyBaseTransform(targetCtx) {
    targetCtx.setTransform(canvas.width / BASE_WIDTH, 0, 0, canvas.height / BASE_HEIGHT, 0, 0);
  }

  function drawCanvasBackground(targetCtx) {
    const gradient = targetCtx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    gradient.addColorStop(0, '#fffefc');
    gradient.addColorStop(1, '#fff3e8');
    targetCtx.fillStyle = gradient;
    targetCtx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    targetCtx.save();
    targetCtx.strokeStyle = 'rgba(101, 66, 55, 0.055)';
    targetCtx.lineWidth = 1;
    for (let x = 0; x <= BASE_WIDTH; x += 36) {
      targetCtx.beginPath();
      targetCtx.moveTo(x + 0.5, 0);
      targetCtx.lineTo(x + 0.5, BASE_HEIGHT);
      targetCtx.stroke();
    }
    for (let y = 0; y <= BASE_HEIGHT; y += 36) {
      targetCtx.beginPath();
      targetCtx.moveTo(0, y + 0.5);
      targetCtx.lineTo(BASE_WIDTH, y + 0.5);
      targetCtx.stroke();
    }
    targetCtx.restore();
  }

  function drawDecor(targetCtx) {
    const blobs = [
      { x: 170, y: 130, r: 110, color: 'rgba(255, 214, 107, 0.13)' },
      { x: 1090, y: 150, r: 145, color: 'rgba(113, 140, 255, 0.10)' },
      { x: 1000, y: 590, r: 160, color: 'rgba(255, 147, 193, 0.10)' },
      { x: 270, y: 585, r: 130, color: 'rgba(102, 202, 146, 0.10)' }
    ];

    for (const blob of blobs) {
      const radial = targetCtx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
      radial.addColorStop(0, blob.color);
      radial.addColorStop(1, 'rgba(255,255,255,0)');
      targetCtx.fillStyle = radial;
      targetCtx.beginPath();
      targetCtx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
      targetCtx.fill();
    }
  }

  function drawGuidePanel(targetCtx, path) {
    const bounds = pathBounds(path, 76);
    targetCtx.save();
    const gradient = targetCtx.createLinearGradient(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
    gradient.addColorStop(0, 'rgba(113, 140, 255, 0.07)');
    gradient.addColorStop(1, 'rgba(143, 231, 241, 0.08)');
    roundedRect(targetCtx, bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 34);
    targetCtx.fillStyle = gradient;
    targetCtx.fill();
    targetCtx.strokeStyle = 'rgba(113, 140, 255, 0.12)';
    targetCtx.lineWidth = 2;
    targetCtx.stroke();
    targetCtx.restore();
  }

  function drawPracticeCorridor(targetCtx, path, width) {
    targetCtx.save();
    targetCtx.lineWidth = width * 2;
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    targetCtx.strokeStyle = state.practice ? 'rgba(102, 202, 146, 0.12)' : 'rgba(113, 140, 255, 0.10)';
    drawPolyline(targetCtx, path);
    targetCtx.restore();
  }

  function drawGuidePath(targetCtx, path) {
    targetCtx.save();
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    targetCtx.lineWidth = 26;
    targetCtx.strokeStyle = 'rgba(113, 140, 255, 0.20)';
    drawPolyline(targetCtx, path);
    targetCtx.lineWidth = 14;
    targetCtx.strokeStyle = 'rgba(255,255,255,0.78)';
    drawPolyline(targetCtx, path);
    targetCtx.setLineDash([14, 12]);
    targetCtx.lineWidth = 7;
    targetCtx.strokeStyle = '#718cff';
    drawPolyline(targetCtx, path);
    targetCtx.restore();
  }

  function drawUserPath(targetCtx, path, color) {
    targetCtx.save();
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    targetCtx.lineWidth = 24;
    targetCtx.strokeStyle = color === '#43bf81' ? 'rgba(67, 191, 129, 0.22)' : 'rgba(255, 138, 92, 0.24)';
    drawPolyline(targetCtx, path);
    targetCtx.lineWidth = 9;
    targetCtx.strokeStyle = color;
    drawPolyline(targetCtx, path);
    targetCtx.restore();
  }

  function drawTrailDots(targetCtx, path) {
    if (path.length < 6) return;
    targetCtx.save();
    const step = Math.max(10, Math.floor(path.length / 16));
    for (let i = 0; i < path.length; i += step) {
      targetCtx.fillStyle = 'rgba(255,255,255,0.68)';
      targetCtx.beginPath();
      targetCtx.arc(path[i].x, path[i].y, 3.2, 0, Math.PI * 2);
      targetCtx.fill();
    }
    targetCtx.restore();
  }

  function drawCurrentPoint(targetCtx, p) {
    if (!p || state.completed) return;
    targetCtx.save();
    targetCtx.fillStyle = '#ff8a5c';
    targetCtx.strokeStyle = 'rgba(255,255,255,0.86)';
    targetCtx.lineWidth = 4;
    targetCtx.beginPath();
    targetCtx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();
    targetCtx.restore();
  }

  function drawPointMarker(targetCtx, p, radius, color, label) {
    targetCtx.save();
    targetCtx.fillStyle = withAlpha(color, 0.18);
    targetCtx.beginPath();
    targetCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.fillStyle = color;
    targetCtx.beginPath();
    targetCtx.arc(p.x, p.y, radius * 0.42, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.fillStyle = 'rgba(255,255,255,0.84)';
    targetCtx.beginPath();
    targetCtx.arc(p.x - radius * 0.08, p.y - radius * 0.08, radius * 0.14, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.font = '900 18px system-ui, sans-serif';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'bottom';
    targetCtx.fillStyle = color;
    targetCtx.fillText(label, p.x, p.y - radius * 0.72);
    targetCtx.restore();
  }

  function drawGuideArrows(targetCtx, path) {
    if (!path || path.length < 20) return;
    const positions = [0.20, 0.48, 0.75];
    targetCtx.save();
    for (const ratio of positions) {
      const index = clamp(Math.floor(path.length * ratio), 2, path.length - 3);
      const prev = path[index - 2];
      const p = path[index];
      const next = path[index + 2];
      const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
      targetCtx.save();
      targetCtx.translate(p.x, p.y);
      targetCtx.rotate(angle);
      targetCtx.fillStyle = 'rgba(113, 140, 255, 0.44)';
      targetCtx.beginPath();
      targetCtx.moveTo(14, 0);
      targetCtx.lineTo(-12, -9);
      targetCtx.lineTo(-7, 0);
      targetCtx.lineTo(-12, 9);
      targetCtx.closePath();
      targetCtx.fill();
      targetCtx.restore();
    }
    targetCtx.restore();
  }

  function drawFrame(targetCtx) {
    targetCtx.save();
    targetCtx.strokeStyle = 'rgba(255,255,255,0.54)';
    targetCtx.lineWidth = 2;
    roundedRect(targetCtx, 12, 12, BASE_WIDTH - 24, BASE_HEIGHT - 24, 32);
    targetCtx.stroke();
    targetCtx.restore();
  }

  function drawPolyline(targetCtx, path) {
    if (!path || path.length < 2) return;
    targetCtx.beginPath();
    targetCtx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i += 1) targetCtx.lineTo(path[i].x, path[i].y);
    targetCtx.stroke();
  }

  function roundedRect(targetCtx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    targetCtx.beginPath();
    targetCtx.moveTo(x + r, y);
    targetCtx.arcTo(x + width, y, x + width, y + height, r);
    targetCtx.arcTo(x + width, y + height, x, y + height, r);
    targetCtx.arcTo(x, y + height, x, y, r);
    targetCtx.arcTo(x, y, x + width, y, r);
    targetCtx.closePath();
  }

  function pathBounds(path, padding = 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of path) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding };
  }

  function withAlpha(hex, alpha) {
    const normalized = hex.replace('#', '');
    const bigint = parseInt(normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function distance(a, b) {
    return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatTime(ms) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function starString(count, spaced) {
    const safe = clamp(Number(count) || 0, 0, 3);
    const value = `${'★'.repeat(safe)}${'☆'.repeat(3 - safe)}`;
    return spaced ? value.split('').join(' ') : value;
  }

  function showToast(message) {
    setText(els.toast, message);
    els.toast.classList.remove('hidden');
    clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      els.toast.classList.add('hidden');
    }, 2600);
  }
})();
