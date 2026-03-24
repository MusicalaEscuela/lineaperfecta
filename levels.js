/* =========================================================
   MUSI · LÍNEA PERFECTA
   levels.js
   Definición de niveles y trayectorias guía
========================================================= */

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

/* =========================================================
   HELPERS DE TRAZO
========================================================= */

function point(x, y) {
  return { x, y };
}

function createLinePath(start, end, segments = 80) {
  const path = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    path.push(
      point(
        lerp(start.x, end.x, t),
        lerp(start.y, end.y, t)
      )
    );
  }

  return path;
}

function createQuadraticPath(start, control, end, segments = 100) {
  const path = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const oneMinusT = 1 - t;

    const x =
      oneMinusT * oneMinusT * start.x +
      2 * oneMinusT * t * control.x +
      t * t * end.x;

    const y =
      oneMinusT * oneMinusT * start.y +
      2 * oneMinusT * t * control.y +
      t * t * end.y;

    path.push(point(x, y));
  }

  return path;
}

function createCubicPath(start, control1, control2, end, segments = 120) {
  const path = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const oneMinusT = 1 - t;

    const x =
      oneMinusT ** 3 * start.x +
      3 * oneMinusT ** 2 * t * control1.x +
      3 * oneMinusT * t ** 2 * control2.x +
      t ** 3 * end.x;

    const y =
      oneMinusT ** 3 * start.y +
      3 * oneMinusT ** 2 * t * control1.y +
      3 * oneMinusT * t ** 2 * control2.y +
      t ** 3 * end.y;

    path.push(point(x, y));
  }

  return path;
}

function createWavePath({
  startX,
  endX,
  centerY,
  amplitude,
  waves,
  segments = 140
}) {
  const path = [];
  const width = endX - startX;

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const x = startX + width * t;
    const y = centerY + Math.sin(t * Math.PI * 2 * waves) * amplitude;
    path.push(point(x, y));
  }

  return path;
}

function createZigZagPath({
  startX,
  endX,
  centerY,
  amplitude,
  peaks,
  segments = 120
}) {
  const path = [];
  const totalWidth = endX - startX;

  for (let i = 0; i <= peaks; i += 1) {
    const t = i / peaks;
    const x = startX + totalWidth * t;
    const y = i % 2 === 0 ? centerY - amplitude : centerY + amplitude;
    path.push(point(x, y));
  }

  return densifyPolyline(path, segments);
}

function createSpiralPath({
  centerX,
  centerY,
  startRadius,
  endRadius,
  turns,
  segments = 180
}) {
  const path = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const angle = turns * Math.PI * 2 * t;
    const radius = lerp(startRadius, endRadius, t);

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    path.push(point(x, y));
  }

  return path;
}

function createLoopPath({
  start,
  loopCenter,
  loopRadius,
  end,
  segmentsLine = 40,
  segmentsLoop = 120
}) {
  const entry = createLinePath(start, point(loopCenter.x - loopRadius, loopCenter.y), segmentsLine);
  const loop = [];

  for (let i = 0; i <= segmentsLoop; i += 1) {
    const t = i / segmentsLoop;
    const angle = Math.PI + t * Math.PI * 2;
    loop.push(
      point(
        loopCenter.x + Math.cos(angle) * loopRadius,
        loopCenter.y + Math.sin(angle) * loopRadius
      )
    );
  }

  const exitStart = loop[loop.length - 1];
  const exit = createLinePath(exitStart, end, segmentsLine);

  return [...entry, ...loop, ...exit];
}

function densifyPolyline(points, segments = 120) {
  if (points.length < 2) return [...points];

  const path = [];
  const totalSections = points.length - 1;
  const stepsPerSection = Math.max(2, Math.floor(segments / totalSections));

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];

    for (let s = 0; s < stepsPerSection; s += 1) {
      const t = s / stepsPerSection;
      path.push(
        point(
          lerp(start.x, end.x, t),
          lerp(start.y, end.y, t)
        )
      );
    }
  }

  path.push(points[points.length - 1]);
  return path;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function createLevel(config) {
  const path = config.path;
  return {
    id: config.id,
    slug: config.slug,
    name: config.name,
    theme: config.theme || "artes-plasticas",
    mission: config.mission,
    keyword: config.keyword,
    mascotTip: config.mascotTip,
    expectedDurationMs: config.expectedDurationMs,
    allowedError: config.allowedError,
    startRadius: config.startRadius || 34,
    endRadius: config.endRadius || 36,
    path,
    startPoint: path[0],
    endPoint: path[path.length - 1],
    baseWidth: BASE_WIDTH,
    baseHeight: BASE_HEIGHT
  };
}

/* =========================================================
   NIVELES
========================================================= */

const level1Path = createLinePath(
  point(190, 360),
  point(1090, 360),
  90
);

const level2Path = createQuadraticPath(
  point(170, 500),
  point(650, 170),
  point(1110, 500),
  110
);

const level3Path = createWavePath({
  startX: 150,
  endX: 1130,
  centerY: 360,
  amplitude: 90,
  waves: 2.5,
  segments: 150
});

const level4Path = createZigZagPath({
  startX: 170,
  endX: 1110,
  centerY: 360,
  amplitude: 120,
  peaks: 7,
  segments: 140
});

const level5Path = createCubicPath(
  point(170, 530),
  point(350, 170),
  point(820, 620),
  point(1100, 250),
  150
);

const level6Path = createLoopPath({
  start: point(160, 360),
  loopCenter: point(560, 360),
  loopRadius: 130,
  end: point(1080, 360),
  segmentsLine: 50,
  segmentsLoop: 140
});

const level7Path = createSpiralPath({
  centerX: 640,
  centerY: 360,
  startRadius: 230,
  endRadius: 36,
  turns: 2.6,
  segments: 220
});

export const LEVELS = [
  createLevel({
    id: 1,
    slug: "pulso-inicial",
    name: "Pulso inicial",
    mission:
      "Sigue una línea recta limpia y estable. Este primer nivel mide control básico del trazo.",
    keyword: "TRAZO",
    mascotTip:
      "No corras. Una línea simple mal hecha igual se ve mal, así que con cariño.",
    expectedDurationMs: 4500,
    allowedError: 24,
    path: level1Path
  }),

  createLevel({
    id: 2,
    slug: "arco-suave",
    name: "Arco suave",
    mission:
      "Traza una curva amplia manteniendo fluidez. Aquí ya importa la suavidad de la mano.",
    keyword: "CURVA",
    mascotTip:
      "Piensa en una pincelada suave, no en una pelea contra el mouse.",
    expectedDurationMs: 5500,
    allowedError: 26,
    path: level2Path
  }),

  createLevel({
    id: 3,
    slug: "onda-musical",
    name: "Onda musical",
    mission:
      "Sigue la onda con ritmo visual. El trazo debe sentirse continuo, casi como una melodía dibujada.",
    keyword: "RITMO",
    mascotTip:
      "Aquí el secreto es el flow. Si te rigidizas, la línea te delata de una.",
    expectedDurationMs: 6500,
    allowedError: 28,
    path: level3Path
  }),

  createLevel({
    id: 4,
    slug: "picos-andinos",
    name: "Picos andinos",
    mission:
      "Supera cambios bruscos de dirección sin perder el control. Precisión y decisión, las dos.",
    keyword: "MONTE",
    mascotTip:
      "Gira con intención. Los picos no se resuelven con nerviosismo digital.",
    expectedDurationMs: 7000,
    allowedError: 30,
    path: level4Path
  }),

  createLevel({
    id: 5,
    slug: "sendero-organico",
    name: "Sendero orgánico",
    mission:
      "Recorre un trazo libre y natural, como una ruta viva. Mantén estabilidad en una forma más compleja.",
    keyword: "FLUJO",
    mascotTip:
      "Este nivel pide escuchar la forma. Sí, raro. Pero funciona.",
    expectedDurationMs: 7600,
    allowedError: 31,
    path: level5Path
  }),

  createLevel({
    id: 6,
    slug: "bucle-magico",
    name: "Bucle mágico",
    mission:
      "Haz una vuelta completa y sal del bucle sin perder el camino. Control fino en curvas cerradas.",
    keyword: "GIRO",
    mascotTip:
      "Entra con calma, rodea con firmeza, sal sin drama. Básico, pero aparentemente necesario.",
    expectedDurationMs: 8200,
    allowedError: 32,
    path: level6Path
  }),

  createLevel({
    id: 7,
    slug: "espiral-de-cierre",
    name: "Espiral de cierre",
    mission:
      "Completa la espiral final con concentración total. Este nivel junta precisión, ritmo y paciencia.",
    keyword: "ARTE",
    mascotTip:
      "Respira y entra hacia el centro como si estuvieras cerrando una obra.",
    expectedDurationMs: 9200,
    allowedError: 34,
    path: level7Path
  })
];

export { BASE_WIDTH, BASE_HEIGHT };