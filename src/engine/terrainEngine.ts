/**
 * 6 km x 6 km Engineering World Terrain Height & Physics Engine
 * Covers world coordinates from -3000m to +3000m in X and Z (36 sq km).
 */

export const MAP_SIZE = 6000; // 6 km x 6 km
export const HALF_MAP = 3000;

/**
 * Returns the exact terrain / bridge / ramp surface height at any world (x, z) coordinate.
 * Solidly prevents vehicles from clipping into mountains or hills.
 */
export function getTerrainHeight(x: number, z: number): number {
  // Clamping to map boundaries
  const cx = Math.max(-HALF_MAP, Math.min(HALF_MAP, x));
  const cz = Math.max(-HALF_MAP, Math.min(HALF_MAP, z));

  // ============================================================
  // 1. CABLE-STAYED RIVER BRIDGE & HIGHWAY VIADUCT
  // ============================================================
  // East-West highway: z between -13 and +13, x between -420 and +380
  if (Math.abs(cz) < 13 && cx > -420 && cx < 380) {
    const bridgeHeight = 12.2;
    if (cx >= -280 && cx <= 240) {
      // Main bridge span
      return bridgeHeight;
    } else if (cx < -280) {
      // West approach ramp (-420 to -280)
      const t = (cx - (-420)) / 140;
      return 0.5 + t * (bridgeHeight - 0.5);
    } else if (cx > 240) {
      // East approach ramp (240 to 380)
      const t = (380 - cx) / 140;
      return 0.5 + t * (bridgeHeight - 0.5);
    }
  }

  // ============================================================
  // 2. HIGH-SPEED RAIL VIADUCT (z = -600, x from -2200 to +2200)
  // ============================================================
  if (Math.abs(cz - (-600)) < 7 && Math.abs(cx) < 2200) {
    return 14.5;
  }

  // ============================================================
  // 3. SOUTH PENINSULA SUSPENSION BRIDGE (z = 950, x from -1200 to -350)
  // ============================================================
  if (Math.abs(cz - 950) < 12 && cx > -1200 && cx < -350) {
    const suspHeight = 18.0;
    if (cx > -1050 && cx < -500) {
      return suspHeight;
    } else if (cx <= -1050) {
      const t = (cx - (-1200)) / 150;
      return 0.5 + t * (suspHeight - 0.5);
    } else {
      const t = (-350 - cx) / 150;
      return 0.5 + t * (suspHeight - 0.5);
    }
  }

  // ============================================================
  // 4. MAIN RIVER CHANNEL BASIN & ESTUARY
  // ============================================================
  const riverCenter = Math.sin(cz * 0.0025) * 160 - 30;
  const distToRiver = Math.abs(cx - riverCenter);

  let riverCarve = 0;
  if (distToRiver < 90) {
    // Smooth river bed depression down to -3.8m
    const factor = Math.cos((distToRiver / 90) * (Math.PI / 2));
    riverCarve = factor * 4.2;
  }

  // ============================================================
  // 5. NATURAL HILLS, MOUNTAINS, RIDGES & CANYONS ACROSS 6KM
  // ============================================================
  let elevation = 0.5; // Base ground level (flat central plain for roads & airport)

  // A. Northern Mountain Range (cz < -350)
  if (cz < -350) {
    const depth = Math.abs(cz - (-350));
    // Rolling mountain waves
    const wave1 = Math.sin(cx * 0.004) * Math.cos(cz * 0.0035) * 35;
    const wave2 = Math.cos(cx * 0.008 + 1.2) * Math.sin(cz * 0.006) * 20;
    const wave3 = Math.sin(cx * 0.015) * 8;
    const ridgeRamp = Math.min(1.0, depth / 800);

    let mountainHeight = (wave1 + wave2 + wave3 + depth * 0.045) * ridgeRamp;

    // Northern Observatory Peak at cx ~ 1100, cz ~ -2100
    const distToPeak = Math.hypot(cx - 1100, cz - (-2100));
    if (distToPeak < 600) {
      const peakFactor = Math.cos((distToPeak / 600) * (Math.PI / 2));
      mountainHeight += peakFactor * peakFactor * 110; // High scenic summit!
    }

    // Hydroelectric Dam Gorge / Reservoir at cx ~ -60, cz ~ -1500
    const distToGorge = Math.hypot(cx - (-60), cz - (-1500));
    if (distToGorge < 350) {
      // Canyon reservoir step
      mountainHeight = Math.min(mountainHeight, 28 + (distToGorge / 350) * 45);
    }

    elevation += Math.max(0, mountainHeight);
  }

  // B. Southern Wind Farm Plateau & Coastal Ridges (cz > 650)
  if (cz > 650) {
    const depth = cz - 650;
    const sWave1 = Math.sin(cx * 0.005) * Math.cos(cz * 0.004) * 26;
    const sWave2 = Math.cos(cx * 0.009) * 14;
    const plateauRamp = Math.min(1.0, depth / 700);

    elevation += Math.max(0, (sWave1 + sWave2 + depth * 0.025) * plateauRamp);
  }

  // C. Eastern Quarry Excavation Terraces (cx: 1100 to 2200, cz: 200 to 1200)
  if (cx > 1100 && cx < 2300 && cz > 200 && cz < 1300) {
    const qDistX = Math.min(cx - 1100, 2300 - cx) / 500;
    const qDistZ = Math.min(cz - 200, 1300 - cz) / 500;
    const pitMask = Math.min(1.0, Math.max(0, Math.min(qDistX, qDistZ)));

    // Stepped terraces
    const rawPit = -14.0 * pitMask;
    const terrace = Math.floor(rawPit / 3.5) * 3.5;
    elevation += terrace;
  }

  // D. Western Seaport Coastline (cx < -1400)
  if (cx < -1400) {
    const coastDepth = Math.abs(cx - (-1400));
    if (coastDepth > 200) {
      // Slopes gently to sea level +1.2m
      elevation = Math.max(1.2, elevation - (coastDepth - 200) * 0.015);
    }
  }

  // Apply river depression
  elevation -= riverCarve;

  return elevation;
}

/**
 * Returns surface normal vector at (x, z) for slope calculation
 */
export function getTerrainNormal(x: number, z: number): { nx: number; ny: number; nz: number } {
  const d = 1.0;
  const hL = getTerrainHeight(x - d, z);
  const hR = getTerrainHeight(x + d, z);
  const hD = getTerrainHeight(x, z - d);
  const hU = getTerrainHeight(x, z + d);

  const nx = (hL - hR) / (2 * d);
  const nz = (hD - hU) / (2 * d);
  const ny = 1.0;

  const len = Math.hypot(nx, ny, nz);
  return { nx: nx / len, ny: ny / len, nz: nz / len };
}
