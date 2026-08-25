import * as THREE from 'three';
import { getTerrainHeight } from './terrainEngine';
import { getAsphaltTexture } from './textures';

export interface RoadSplinePoint {
  x: number;
  z: number;
  /** Optional explicit elevation (world Y). When any control point defines this,
   * the road ribbon is elevated (interpolated between control points) instead of
   * hugging the raw terrain height — used for flyovers / viaducts. */
  y?: number;
}

/**
 * Generates a smooth, curved 3D road ribbon conforming tightly to terrain heights.
 * If any control point specifies an explicit `y`, the ribbon's elevation is
 * interpolated along the spline from those control-point elevations instead of
 * sampling raw terrain height — this keeps elevated flyovers actually elevated.
 */
export function createCurvedRoadMesh(
  points: RoadSplinePoint[],
  width: number = 10,
  type: 'road' | 'highway' | 'rural_dirt' = 'road',
  sampleResolution: number = 80
): THREE.Group {
  const group = new THREE.Group();
  if (points.length < 2) return group;

  // 1. Generate Catmull-Rom Spline in 2D (X, Z)
  const vec2Points = points.map((p) => new THREE.Vector2(p.x, p.z));
  const curve = new THREE.SplineCurve(vec2Points);

  const totalPoints = Math.max(points.length * 15, sampleResolution);
  const sampledPoints = curve.getPoints(totalPoints);

  // Elevation profile: if the caller supplied explicit elevations, interpolate
  // them across the sampled points (parametrized the same way SplineCurve
  // walks its control points) so the ribbon rises/falls smoothly and in sync
  // with the pier columns built from the same control points.
  const hasExplicitElevation = points.some((p) => typeof p.y === 'number');
  const controlElevations = points.map((p) => (typeof p.y === 'number' ? p.y : null));
  const getElevationAt = (t: number): number | null => {
    if (!hasExplicitElevation) return null;
    const u = t * (points.length - 1);
    const seg = Math.min(points.length - 2, Math.max(0, Math.floor(u)));
    const frac = u - seg;
    const eA = controlElevations[seg];
    const eB = controlElevations[seg + 1];
    if (eA === null && eB === null) return null;
    const resolvedA = eA ?? eB!;
    const resolvedB = eB ?? eA!;
    return resolvedA + (resolvedB - resolvedA) * frac;
  };

  // 2. Build 3D Road Ribbon Geometry
  const roadGeo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let accumulatedDist = 0;
  let prevCenter = sampledPoints[0];

  for (let i = 0; i < sampledPoints.length; i++) {
    const pt = sampledPoints[i];
    accumulatedDist += pt.distanceTo(prevCenter);
    prevCenter = pt;

    // Calculate tangent vector along the curve
    let tangent: THREE.Vector2;
    if (i === 0) {
      tangent = sampledPoints[1].clone().sub(pt).normalize();
    } else if (i === sampledPoints.length - 1) {
      tangent = pt.clone().sub(sampledPoints[i - 1]).normalize();
    } else {
      tangent = sampledPoints[i + 1].clone().sub(sampledPoints[i - 1]).normalize();
    }

    // Normal perpendicular vector in XZ plane
    const normal = new THREE.Vector2(-tangent.y, tangent.x);

    // Left and Right edge world positions
    const halfW = width / 2;
    const lx = pt.x - normal.x * halfW;
    const lz = pt.y - normal.y * halfW;
    const rx = pt.x + normal.x * halfW;
    const rz = pt.y + normal.y * halfW;

    // Sample terrain elevation with a small vertical offset to prevent Z-fighting.
    // Elevated flyovers use the interpolated control-point elevation instead so
    // the road ribbon actually rises with its pier columns rather than sitting
    // on the ground beneath them.
    const elev = getElevationAt(i / (sampledPoints.length - 1));
    const ly = (elev ?? getTerrainHeight(lx, lz)) + 0.18;
    const ry = (elev ?? getTerrainHeight(rx, rz)) + 0.18;

    // Add Left & Right vertices
    positions.push(lx, ly, lz);
    positions.push(rx, ry, rz);

    // UV coordinates (V maps along road distance)
    const vCoord = accumulatedDist * 0.08;
    uvs.push(0, vCoord);
    uvs.push(1, vCoord);

    // Add quad indices
    if (i < sampledPoints.length - 1) {
      const vertIdx = i * 2;
      indices.push(vertIdx, vertIdx + 1, vertIdx + 2);
      indices.push(vertIdx + 1, vertIdx + 3, vertIdx + 2);
    }
  }

  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roadGeo.setIndex(indices);
  roadGeo.computeVertexNormals();

  let mat: THREE.Material;
  if (type === 'rural_dirt') {
    const dirtTex = getAsphaltTexture('road');
    dirtTex.repeat.set(1, 1);
    mat = new THREE.MeshStandardMaterial({
      color: 0x8b7355, // Warm rustic gravel/dirt road
      roughness: 0.95,
      metalness: 0.05,
    });
  } else {
    const tex = getAsphaltTexture(type === 'highway' ? 'highway' : 'road');
    tex.repeat.set(1, 1);
    mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.75,
      metalness: 0.1,
    });
  }

  const roadMesh = new THREE.Mesh(roadGeo, mat);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // Add side gravel/grass shoulder strip
  const shoulderGeo = new THREE.BufferGeometry();
  const shoulderPos: number[] = [];
  const shoulderIndices: number[] = [];

  for (let i = 0; i < sampledPoints.length; i++) {
    const pt = sampledPoints[i];
    let tangent: THREE.Vector2;
    if (i === 0) tangent = sampledPoints[1].clone().sub(pt).normalize();
    else if (i === sampledPoints.length - 1) tangent = pt.clone().sub(sampledPoints[i - 1]).normalize();
    else tangent = sampledPoints[i + 1].clone().sub(sampledPoints[i - 1]).normalize();

    const normal = new THREE.Vector2(-tangent.y, tangent.x);
    const halfW = width / 2;
    const shoulderW = 1.4;

    const lx = pt.x - normal.x * (halfW + shoulderW);
    const lz = pt.y - normal.y * (halfW + shoulderW);
    const rx = pt.x + normal.x * (halfW + shoulderW);
    const rz = pt.y + normal.y * (halfW + shoulderW);

    const innerLx = pt.x - normal.x * halfW;
    const innerLz = pt.y - normal.y * halfW;
    const innerRx = pt.x + normal.x * halfW;
    const innerRz = pt.y + normal.y * halfW;

    const elevShoulder = getElevationAt(i / (sampledPoints.length - 1));
    const ly = (elevShoulder ?? getTerrainHeight(lx, lz)) + 0.12;
    const ry = (elevShoulder ?? getTerrainHeight(rx, rz)) + 0.12;
    const inLy = (elevShoulder ?? getTerrainHeight(innerLx, innerLz)) + 0.15;
    const inRy = (elevShoulder ?? getTerrainHeight(innerRx, innerRz)) + 0.15;

    // 4 points per segment for left & right shoulders
    shoulderPos.push(lx, ly, lz);
    shoulderPos.push(innerLx, inLy, innerLz);
    shoulderPos.push(innerRx, inRy, innerRz);
    shoulderPos.push(rx, ry, rz);

    if (i < sampledPoints.length - 1) {
      const base = i * 4;
      // Left shoulder quad
      shoulderIndices.push(base, base + 1, base + 4);
      shoulderIndices.push(base + 1, base + 5, base + 4);
      // Right shoulder quad
      shoulderIndices.push(base + 2, base + 3, base + 6);
      shoulderIndices.push(base + 3, base + 7, base + 6);
    }
  }

  shoulderGeo.setAttribute('position', new THREE.Float32BufferAttribute(shoulderPos, 3));
  shoulderGeo.setIndex(shoulderIndices);
  shoulderGeo.computeVertexNormals();

  const shoulderMat = new THREE.MeshStandardMaterial({
    color: type === 'rural_dirt' ? 0x5c4d3c : 0x475569,
    roughness: 0.9,
  });
  const shoulderMesh = new THREE.Mesh(shoulderGeo, shoulderMat);
  shoulderMesh.receiveShadow = true;
  group.add(shoulderMesh);

  return group;
}
