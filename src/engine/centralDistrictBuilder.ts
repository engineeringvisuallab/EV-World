import * as THREE from 'three';
import { getTerrainHeight } from './terrainEngine';
import { getBuildingFacadeTexture, getConcreteTexture } from './textures';
import { createCurvedRoadMesh, RoadSplinePoint } from './curvedRoadEngine';

export interface CentralDistrictResult {
  group: THREE.Group;
  interactiveObjects: THREE.Object3D[];
  animatables: { update: (time: number, delta: number) => void }[];
}

/**
 * Builds the Central Iconic District according to the Reference Image:
 * 1. Elevated Curved Flyover & Highway Interchange
 * 2. Grand White Central Mosque with 4 minarets & central dome
 * 3. Terraced Historic Terracotta Temple
 * 4. Central Multi-Specialty Hospital & Emergency Bay
 * 5. Active High-Rise Construction Site with Animated Tower Crane & Excavator
 * 6. Fuel & Fast-EV Charging Station
 * 7. City Park, Children's Playground & Surface Parking Lot
 */
export function buildCentralIconicDistrict(scene: THREE.Scene): CentralDistrictResult {
  const masterGroup = new THREE.Group();
  masterGroup.name = 'central_iconic_district';
  const interactiveObjects: THREE.Object3D[] = [];
  const animatables: { update: (time: number, delta: number) => void }[] = [];

  // =========================================================================
  // 1. ELEVATED CURVED FLYOVER & HIGHWAY INTERCHANGE
  // =========================================================================
  const flyoverPoints: RoadSplinePoint[] = [
    { x: -280, z: -10, y: 0.5 },
    { x: -190, z: 15, y: 5.5 },
    { x: -100, z: 45, y: 11.5 },
    { x: -10, z: 50, y: 13.0 },
    { x: 80, z: 35, y: 13.5 },
    { x: 170, z: -15, y: 14.0 },
    { x: 260, z: -90, y: 14.0 },
    { x: 360, z: -170, y: 14.0 }, // Crosses towards the river bridge
  ];
  const flyoverRoad = createCurvedRoadMesh(flyoverPoints, 12, 'highway', 120);
  masterGroup.add(flyoverRoad);

  // Heavy Concrete Pier Columns Supporting the Elevated Flyover
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.6,
    metalness: 0.1,
  });
  const pierGeo = new THREE.CylinderGeometry(1.6, 1.8, 14, 16);
  const pierCapGeo = new THREE.BoxGeometry(11.5, 1.5, 3.2);

  for (let i = 1; i < flyoverPoints.length - 1; i++) {
    const pt = flyoverPoints[i];
    const pierY = pt.y ?? 10;
    const groundY = getTerrainHeight(pt.x, pt.z);
    const heightDiff = Math.max(2, pierY - groundY - 0.7);

    const pierGroup = new THREE.Group();
    pierGroup.position.set(pt.x, groundY + heightDiff / 2, pt.z);

    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, heightDiff, 16), concreteMat);
    col.castShadow = true;
    col.receiveShadow = true;

    const cap = new THREE.Mesh(pierCapGeo, concreteMat);
    cap.position.set(0, heightDiff / 2, 0);
    cap.castShadow = true;

    pierGroup.add(col, cap);
    masterGroup.add(pierGroup);
  }

  // =========================================================================
  // 2. GRAND WHITE CENTRAL MOSQUE (সাদা জামে মসজিদ)
  // Location: x = 90, z = -180
  // =========================================================================
  const mosqueX = 90;
  const mosqueZ = -180;
  const mosqueY = getTerrainHeight(mosqueX, mosqueZ);

  const mosqueGroup = new THREE.Group();
  mosqueGroup.position.set(mosqueX, mosqueY, mosqueZ);
  mosqueGroup.userData = { engineeringId: 'grand_central_mosque' };

  const whiteMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.05,
  });
  const goldFinialMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.9,
    roughness: 0.2,
  });
  const archWoodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.6,
  });

  // Elevated Paved Courtyard (Plaza)
  const plazaW = 90;
  const plazaL = 80;
  const plazaH = 1.4;
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(plazaW, plazaH, plazaL), whiteMarbleMat);
  plaza.position.set(0, plazaH / 2, 0);
  plaza.receiveShadow = true;
  mosqueGroup.add(plaza);

  // Main Prayer Hall Sanctuary
  const hallW = 46;
  const hallL = 40;
  const hallH = 18;
  const prayerHall = new THREE.Mesh(new THREE.BoxGeometry(hallW, hallH, hallL), whiteMarbleMat);
  prayerHall.position.set(0, plazaH + hallH / 2, 0);
  prayerHall.castShadow = true;
  prayerHall.receiveShadow = true;
  mosqueGroup.add(prayerHall);

  // Arched Portico Facade (Front Entrance)
  const porticoW = 34;
  const porticoH = 12;
  const portico = new THREE.Mesh(new THREE.BoxGeometry(porticoW, porticoH, 6), whiteMarbleMat);
  portico.position.set(0, plazaH + porticoH / 2, hallL / 2 + 3);
  portico.castShadow = true;
  mosqueGroup.add(portico);

  // Triple Arched Entrance Portals
  for (let a = -1; a <= 1; a++) {
    const archHole = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 6.2, 16, 1, false, 0, Math.PI), archWoodMat);
    archHole.position.set(a * 9.5, plazaH + 7, hallL / 2 + 3);
    archHole.rotation.z = Math.PI;
    mosqueGroup.add(archHole);

    // Front Grand Steps
    const steps = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 6), whiteMarbleMat);
    steps.position.set(a * 9.5, plazaH / 2, hallL / 2 + 7.5);
    mosqueGroup.add(steps);
  }

  // Giant Center Dome
  const domeRadius = 13.5;
  const domeGeo = new THREE.SphereGeometry(domeRadius, 28, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  const mainDome = new THREE.Mesh(domeGeo, whiteMarbleMat);
  mainDome.position.set(0, plazaH + hallH, 0);
  mainDome.castShadow = true;

  // Central Gold Crescent Finial Spire
  const spireGeo = new THREE.CylinderGeometry(0.1, 0.6, 7.5, 12);
  const spire = new THREE.Mesh(spireGeo, goldFinialMat);
  spire.position.set(0, plazaH + hallH + domeRadius + 3.2, 0);

  const crescentGeo = new THREE.TorusGeometry(1.2, 0.25, 12, 24, Math.PI * 1.5);
  const crescent = new THREE.Mesh(crescentGeo, goldFinialMat);
  crescent.position.set(0, plazaH + hallH + domeRadius + 7.2, 0);
  crescent.rotation.z = Math.PI / 4;

  mosqueGroup.add(mainDome, spire, crescent);

  // 4 Corner Minarets (Height ~ 42m)
  const minaretOffsets = [
    { x: -hallW / 2 + 2, z: -hallL / 2 + 2 },
    { x: hallW / 2 - 2, z: -hallL / 2 + 2 },
    { x: -hallW / 2 + 2, z: hallL / 2 - 2 },
    { x: hallW / 2 - 2, z: hallL / 2 - 2 },
  ];

  minaretOffsets.forEach((pos) => {
    const minaret = new THREE.Group();
    minaret.position.set(pos.x, plazaH, pos.z);

    // Tower Shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.6, 38, 16), whiteMarbleMat);
    shaft.position.set(0, 19, 0);
    shaft.castShadow = true;

    // Balcony Gallery 1
    const bal1 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.4, 1.4, 16), whiteMarbleMat);
    bal1.position.set(0, 24, 0);

    // Balcony Gallery 2 (Upper)
    const bal2 = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.0, 1.2, 16), whiteMarbleMat);
    bal2.position.set(0, 34, 0);

    // Minaret Cap Dome & Spire
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(1.9, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), whiteMarbleMat);
    capDome.position.set(0, 38, 0);

    const mSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.4, 5.0, 10), goldFinialMat);
    mSpire.position.set(0, 41, 0);

    minaret.add(shaft, bal1, bal2, capDome, mSpire);
    mosqueGroup.add(minaret);
  });

  // Courtyard Landscaping (Palm trees & ablution pond)
  const ablutionPool = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, 0.8, 24),
    new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.1, transmission: 0.85 })
  );
  ablutionPool.position.set(0, plazaH + 0.3, 26);
  mosqueGroup.add(ablutionPool);

  interactiveObjects.push(mosqueGroup);
  masterGroup.add(mosqueGroup);

  // =========================================================================
  // 3. TERRACED HISTORIC TERRACOTTA TEMPLE (ঐতিহাসিক মন্দির)
  // Location: x = 25, z = -155
  // =========================================================================
  const templeX = 25;
  const templeZ = -280;
  const templeY = getTerrainHeight(templeX, templeZ);

  const templeGroup = new THREE.Group();
  templeGroup.position.set(templeX, templeY, templeZ);
  templeGroup.userData = { engineeringId: 'terracotta_temple' };

  const terracottaMat = new THREE.MeshStandardMaterial({
    color: 0xc2410c, // Rich Terracotta Orange/Red
    roughness: 0.85,
    metalness: 0.05,
  });
  const brickOrnamentMat = new THREE.MeshStandardMaterial({
    color: 0x9a3412,
    roughness: 0.9,
  });

  // 3-Tier Stepped Plinth Platform
  for (let tier = 0; tier < 3; tier++) {
    const size = 32 - tier * 5;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(size, 1.2, size), terracottaMat);
    plinth.position.set(0, tier * 1.2 + 0.6, 0);
    plinth.receiveShadow = true;
    templeGroup.add(plinth);
  }

  // Central Sanctum Sanctuary (Garbhagriha)
  const sanctumW = 18;
  const sanctumH = 14;
  const sanctum = new THREE.Mesh(new THREE.BoxGeometry(sanctumW, sanctumH, sanctumW), terracottaMat);
  sanctum.position.set(0, 3.6 + sanctumH / 2, 0);
  sanctum.castShadow = true;
  templeGroup.add(sanctum);

  // Stepped Curvilinear Shikhara (Tower Spire - Height 26m)
  for (let s = 0; s < 7; s++) {
    const layerW = 17 - s * 2.1;
    const layerH = 3.2;
    const layer = new THREE.Mesh(new THREE.BoxGeometry(layerW, layerH, layerW), brickOrnamentMat);
    layer.position.set(0, 3.6 + sanctumH + s * layerH + layerH / 2, 0);
    layer.castShadow = true;
    templeGroup.add(layer);
  }

  // Amalaka & Kalasha Finial on Top
  const amalaka = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 1.6, 16), terracottaMat);
  amalaka.position.set(0, 3.6 + sanctumH + 7 * 3.2 + 0.8, 0);

  const kalasha = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.2, 12), goldFinialMat);
  kalasha.position.set(0, 3.6 + sanctumH + 7 * 3.2 + 2.8, 0);

  templeGroup.add(amalaka, kalasha);

  // Front Entry Mandapa with Carved Pillars
  const mandapaW = 12;
  const mandapaL = 10;
  const mandapaRoof = new THREE.Mesh(new THREE.ConeGeometry(9, 5, 4), terracottaMat);
  mandapaRoof.position.set(0, 3.6 + 10, sanctumW / 2 + mandapaL / 2);
  mandapaRoof.rotation.y = Math.PI / 4;
  templeGroup.add(mandapaRoof);

  interactiveObjects.push(templeGroup);
  masterGroup.add(templeGroup);

  // =========================================================================
  // 4. CENTRAL MULTI-SPECIALTY HOSPITAL & EMERGENCY WING
  // Location: x = -190, z = -70
  // =========================================================================
  const hospX = -190;
  const hospZ = -70;
  const hospY = getTerrainHeight(hospX, hospZ);

  const hospitalGroup = new THREE.Group();
  hospitalGroup.position.set(hospX, hospY, hospZ);
  hospitalGroup.userData = { engineeringId: 'central_general_hospital' };

  const whiteClinicMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.35,
    metalness: 0.1,
  });
  const medicalBlueMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Medical Blue accent
    roughness: 0.4,
  });
  const redCrossMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626, // Red Cross
    emissive: 0xdc2626,
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });

  // Main 6-Story Hospital Complex (W: 48m, L: 38m, H: 26m)
  const hospBody = new THREE.Mesh(new THREE.BoxGeometry(48, 26, 38), whiteClinicMat);
  hospBody.position.set(0, 13, 0);
  hospBody.castShadow = true;
  hospBody.receiveShadow = true;

  // Blue Accent Facade Ribbon
  const blueBand = new THREE.Mesh(new THREE.BoxGeometry(48.4, 3.2, 38.4), medicalBlueMat);
  blueBand.position.set(0, 16, 0);

  // Rooftop Illuminated Red Cross Signs (Front & Back)
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.4, 0.4), redCrossMat);
  crossH.position.set(0, 29, 19.3);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.0, 0.4), redCrossMat);
  crossV.position.set(0, 29, 19.3);

  // Large "H" Medical Landmark on Top of Roof
  const hPillarL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7.0, 0.6), redCrossMat);
  hPillarL.position.set(-2.5, 30, 0);
  const hPillarR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7.0, 0.6), redCrossMat);
  hPillarR.position.set(2.5, 30, 0);
  const hCrossBar = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.2, 0.6), redCrossMat);
  hCrossBar.position.set(0, 30, 0);

  hospitalGroup.add(hospBody, blueBand, crossH, crossV, hPillarL, hPillarR, hCrossBar);

  // Emergency Ambulance Covered Bay & Driveway
  const emBayRoof = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 14), whiteClinicMat);
  emBayRoof.position.set(0, 6.0, 24);
  emBayRoof.castShadow = true;

  const emPillar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 12), medicalBlueMat);
  emPillar1.position.set(-10, 3, 29);
  const emPillar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 12), medicalBlueMat);
  emPillar2.position.set(10, 3, 29);

  // Emergency Signboard
  const emSign = new THREE.Mesh(new THREE.BoxGeometry(16, 1.8, 0.4), redCrossMat);
  emSign.position.set(0, 7.2, 30.8);

  hospitalGroup.add(emBayRoof, emPillar1, emPillar2, emSign);

  // Parked Ambulances outside emergency bay
  for (let amb = -1; amb <= 1; amb += 2) {
    const ambulance = createAmbulanceModel(amb * 6.5, 0, 23);
    hospitalGroup.add(ambulance);
  }

  interactiveObjects.push(hospitalGroup);
  masterGroup.add(hospitalGroup);

  // =========================================================================
  // 5. ACTIVE HIGH-RISE CONSTRUCTION SITE WITH ROTATING TOWER CRANE
  // Location: x = -160, z = 75
  // =========================================================================
  const constrX = -160;
  const constrZ = 75;
  const constrY = getTerrainHeight(constrX, constrZ);

  const constrGroup = new THREE.Group();
  constrGroup.position.set(constrX, constrY, constrZ);
  constrGroup.userData = { engineeringId: 'active_construction_site' };

  const yellowCraneMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15, // Bright Construction Yellow
    metalness: 0.7,
    roughness: 0.3,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.7,
  });

  // Construction Site Excavation Boundary Wall / Corrugated Fence
  const siteW = 60;
  const siteL = 50;
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
  const fenceNorth = new THREE.Mesh(new THREE.BoxGeometry(siteW, 3.2, 0.3), fenceMat);
  fenceNorth.position.set(0, 1.6, -siteL / 2);
  const fenceSouth = new THREE.Mesh(new THREE.BoxGeometry(siteW, 3.2, 0.3), fenceMat);
  fenceSouth.position.set(0, 1.6, siteL / 2);
  const fenceEast = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, siteL), fenceMat);
  fenceEast.position.set(siteW / 2, 1.6, 0);
  const fenceWest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, siteL), fenceMat);
  fenceWest.position.set(-siteW / 2, 1.6, 0);

  // Excavated Foundation Pit Bed
  const pitBed = new THREE.Mesh(
    new THREE.BoxGeometry(siteW - 6, 0.4, siteL - 6),
    new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.95 })
  );
  pitBed.position.set(0, 0.2, 0);
  pitBed.receiveShadow = true;

  constrGroup.add(fenceNorth, fenceSouth, fenceEast, fenceWest, pitBed);

  // Steel Rebar Reinforced Concrete Columns under construction
  for (let rx = -16; rx <= 16; rx += 10) {
    for (let rz = -14; rz <= 14; rz += 10) {
      const colHeight = 6 + Math.random() * 8;
      const rebarCol = new THREE.Mesh(new THREE.BoxGeometry(1.4, colHeight, 1.4), concreteMat);
      rebarCol.position.set(rx, colHeight / 2, rz);
      rebarCol.castShadow = true;

      // Top exposed rebar spikes
      const rebarSpikes = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), darkSteelMat);
      rebarSpikes.position.set(rx, colHeight + 1.2, rz);

      constrGroup.add(rebarCol, rebarSpikes);
    }
  }

  // Giant Yellow Lattice Tower Crane (Mast 42m, Jib 36m)
  const towerMast = new THREE.Mesh(new THREE.BoxGeometry(2.4, 44, 2.4), yellowCraneMat);
  towerMast.position.set(12, 22, -10);
  towerMast.castShadow = true;
  constrGroup.add(towerMast);

  // Slewing Jib & Hook Assembly
  const jibAssembly = new THREE.Group();
  jibAssembly.name = 'towerCraneJib';
  jibAssembly.position.set(12, 44, -10);

  // Operator Cabin
  const craneCab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 3.0), yellowCraneMat);
  craneCab.position.set(1.5, 0, 1.5);

  // Forward Working Jib Boom (Length 38m)
  const workingJib = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 38), yellowCraneMat);
  workingJib.position.set(0, 1.2, 19);
  workingJib.castShadow = true;

  // Counter-Jib with Concrete Ballast Blocks (Length 14m)
  const counterJib = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 14), yellowCraneMat);
  counterJib.position.set(0, 1.2, -7);

  const counterWeight = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.4, 4.5), darkSteelMat);
  counterWeight.position.set(0, 1.2, -12);

  // Crane Trolley & Cable Hook
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.8), darkSteelMat);
  trolley.position.set(0, 0.3, 22);

  const hoistCable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 24, 6), darkSteelMat);
  hoistCable.position.set(0, -11.7, 22);

  const hookBlock = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 1.0), yellowCraneMat);
  hookBlock.position.set(0, -23.5, 22);

  jibAssembly.add(craneCab, workingJib, counterJib, counterWeight, trolley, hoistCable, hookBlock);
  constrGroup.add(jibAssembly);

  // Animated Crane Slew Rotation
  animatables.push({
    update: (time) => {
      jibAssembly.rotation.y = Math.sin(time * 0.25) * 1.4;
    },
  });

  // Crawler Excavator & Concrete Mixer parked on site
  const excavator = createExcavatorModel(-16, 0.2, 12);
  const mixerTruck = createCementMixerTruck(14, 0.2, 14);
  constrGroup.add(excavator, mixerTruck);

  interactiveObjects.push(constrGroup);
  masterGroup.add(constrGroup);

  // =========================================================================
  // 6. METROPOLITAN FUEL & FAST-EV CHARGING STATION
  // Location: x = -75, z = -90
  // =========================================================================
  const gasX = -75;
  const gasZ = -90;
  const baseY = getTerrainHeight(gasX, gasZ);

  const gasStationGroup = new THREE.Group();
  gasStationGroup.position.set(gasX, baseY, gasZ);
  gasStationGroup.userData = { engineeringId: 'fuel_ev_station' };

  const gasCanopyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.3,
  });
  const evGreenMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e, // Glowing Green EV
    emissive: 0x22c55e,
    emissiveIntensity: 0.4,
  });

  // Modern Streamlined Fuel Canopy (W: 36m, L: 20m, H: 6.5m)
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(36, 1.4, 20), gasCanopyMat);
  canopy.position.set(0, 6.5, 0);
  canopy.castShadow = true;

  // Canopy Pillars
  for (let px = -12; px <= 12; px += 24) {
    for (let pz = -6; pz <= 6; pz += 12) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 6.5, 16), concreteMat);
      pillar.position.set(px, 3.25, pz);
      pillar.castShadow = true;
      gasStationGroup.add(pillar);
    }
  }

  // 4 Fuel Pump Dispenser Islands
  for (let px = -10; px <= 10; px += 20) {
    for (let pz = -4; pz <= 4; pz += 8) {
      const pumpIsland = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 5.0), concreteMat);
      pumpIsland.position.set(px, 0.2, pz);

      const pumpUnit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 1.8), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
      pumpUnit.position.set(px, 1.5, pz);

      gasStationGroup.add(pumpIsland, pumpUnit);
    }
  }

  // 4 Dedicated Rapid EV Charging Stalls (with glowing green LEDs)
  for (let ev = 0; ev < 4; ev++) {
    const stallX = -14 + ev * 8;
    const evCharger = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), darkSteelMat);
    evCharger.position.set(stallX, 1.1, 16);

    const evScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), evGreenMat);
    evScreen.position.set(stallX, 1.5, 16.42);

    gasStationGroup.add(evCharger, evScreen);
  }

  // 24/7 Convenience Store & Café Building
  const cStore = new THREE.Mesh(
    new THREE.BoxGeometry(22, 5.5, 14),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
  );
  cStore.position.set(0, 2.75, -18);
  cStore.castShadow = true;

  const cStoreRoofSign = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 0.3), evGreenMat);
  cStoreRoofSign.position.set(0, 5.6, -10.9);

  gasStationGroup.add(canopy, cStore, cStoreRoofSign);
  interactiveObjects.push(gasStationGroup);
  masterGroup.add(gasStationGroup);

  // =========================================================================
  // 7. CIVIC PARK, CHILDREN'S PLAYGROUND & SURFACE PARKING LOT
  // Location: x = -110, z = -10 (Park), x = -40, z = 120 (Parking Lot)
  // =========================================================================
  const parkX = -110;
  const parkZ = -10;
  const parkY = getTerrainHeight(parkX, parkZ);

  const parkGroup = new THREE.Group();
  parkGroup.position.set(parkX, parkY, parkZ);
  parkGroup.userData = { engineeringId: 'city_park_playground' };

  // Manicured Grass Lawn
  const lawnGeo = new THREE.PlaneGeometry(65, 55, 10, 10);
  lawnGeo.rotateX(-Math.PI / 2);
  const lawnMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.85 });
  const lawn = new THREE.Mesh(lawnGeo, lawnMat);
  lawn.position.set(0, 0.1, 0);
  lawn.receiveShadow = true;
  parkGroup.add(lawn);

  // Playground Swings & Slide Set
  const swingFrameMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8, roughness: 0.3 });
  const swingA1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.5, 8), swingFrameMat);
  swingA1.position.set(-6, 2.1, 0);
  swingA1.rotation.z = 0.25;
  const swingA2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.5, 8), swingFrameMat);
  swingA2.position.set(6, 2.1, 0);
  swingA2.rotation.z = -0.25;
  const swingBar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 12.5, 12), swingFrameMat);
  swingBar.rotation.z = Math.PI / 2;
  swingBar.position.set(0, 4.2, 0);
  parkGroup.add(swingA1, swingA2, swingBar);

  // Spiral Slide
  const slideMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
  const slideTower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.2, 2.2), slideMat);
  slideTower.position.set(12, 2.1, 8);
  const slideChute = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 6.5, 12), slideMat);
  slideChute.position.set(15, 1.8, 11);
  slideChute.rotation.x = 0.6;
  parkGroup.add(slideTower, slideChute);

  // Decorative Park Trees & Stone Benches
  for (let t = 0; t < 10; t++) {
    const angle = (t * Math.PI * 2) / 10;
    const dist = 22 + (t % 3) * 4;
    const tree = createParkDeciduousTree(Math.cos(angle) * dist, 0.1, Math.sin(angle) * dist);
    parkGroup.add(tree);
  }

  interactiveObjects.push(parkGroup);
  masterGroup.add(parkGroup);

  // -------------------------------------------------------------------------
  // Surface Public Parking Lot with 20+ Marked Bays and Parked Cars
  // Location: x = -30, z = 120
  // -------------------------------------------------------------------------
  const parkingGroup = new THREE.Group();
  const pkX = -30;
  const pkZ = 120;
  parkingGroup.position.set(pkX, getTerrainHeight(pkX, pkZ), pkZ);

  const parkLotAsphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(55, 36),
    new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 })
  );
  parkLotAsphalt.rotation.x = -Math.PI / 2;
  parkLotAsphalt.position.set(0, 0.12, 0);
  parkLotAsphalt.receiveShadow = true;
  parkingGroup.add(parkLotAsphalt);

  // White Parking Bay Marking Lines
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let bay = -22; bay <= 22; bay += 4.4) {
    const bayLine1 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 6.0), lineMat);
    bayLine1.rotation.x = -Math.PI / 2;
    bayLine1.position.set(bay, 0.15, -8);

    const bayLine2 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 6.0), lineMat);
    bayLine2.rotation.x = -Math.PI / 2;
    bayLine2.position.set(bay, 0.15, 8);

    parkingGroup.add(bayLine1, bayLine2);
  }

  // Scatter Diverse Parked Cars across the parking lot
  const carColors = [0xdc2626, 0x2563eb, 0xf8fafc, 0x18181b, 0xeab308, 0x16a34a, 0x9333ea];
  for (let c = 0; c < 12; c++) {
    const row = c < 6 ? -8 : 8;
    const col = -18 + (c % 6) * 7.2;
    const carMesh = createParkedSedan(col, 0.15, row, c < 6 ? 0 : Math.PI, carColors[c % carColors.length]);
    parkingGroup.add(carMesh);
  }

  masterGroup.add(parkingGroup);

  scene.add(masterGroup);

  return {
    group: masterGroup,
    interactiveObjects,
    animatables,
  };
}

// ---------------------------------------------------------------------------
// Helper Vehicle & Asset Model Builders
// ---------------------------------------------------------------------------

function createAmbulanceModel(x: number, y: number, z: number): THREE.Group {
  const amb = new THREE.Group();
  amb.position.set(x, y, z);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
  const blueLightMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.8,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 5.5), whiteMat);
  body.position.set(0, 1.4, 0);
  body.castShadow = true;

  const redStripe = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.4, 5.54), redMat);
  redStripe.position.set(0, 1.3, 0);

  const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.6), blueLightMat);
  lightBar.position.set(0, 2.6, 1.2);

  amb.add(body, redStripe, lightBar);
  return amb;
}

function createCementMixerTruck(x: number, y: number, z: number): THREE.Group {
  const truck = new THREE.Group();
  truck.position.set(x, y, z);

  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const drumMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5, metalness: 0.4 });

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 2.6), yellowMat);
  cab.position.set(0, 1.8, 3.2);

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 8.5), new THREE.MeshStandardMaterial({ color: 0x18181b }));
  chassis.position.set(0, 0.8, 0);

  const drumGeo = new THREE.CylinderGeometry(1.4, 1.9, 5.0, 16);
  drumGeo.rotateX(Math.PI / 2.3);
  const drum = new THREE.Mesh(drumGeo, drumMat);
  drum.position.set(0, 2.6, -1.0);
  drum.castShadow = true;

  truck.add(cab, chassis, drum);
  return truck;
}

function createExcavatorModel(x: number, y: number, z: number): THREE.Group {
  const exc = new THREE.Group();
  exc.position.set(x, y, z);

  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });

  const tracks = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 4.8), darkMat);
  tracks.position.set(0, 0.45, 0);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.0, 3.2), yellowMat);
  cab.position.set(0, 1.9, 0);

  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 6.5), yellowMat);
  boom.position.set(0, 3.6, 3.2);
  boom.rotation.x = 0.5;

  const bucket = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), darkMat);
  bucket.position.set(0, 1.5, 6.2);

  exc.add(tracks, cab, boom, bucket);
  return exc;
}

function createParkedSedan(x: number, y: number, z: number, rotation: number, color: number): THREE.Group {
  const car = new THREE.Group();
  car.position.set(x, y, z);
  car.rotation.y = rotation;

  const paintMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });

  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 4.4), paintMat);
  lowerBody.position.set(0, 0.6, 0);
  lowerBody.castShadow = true;

  const greenhouse = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 2.4), darkMat);
  greenhouse.position.set(0, 1.35, -0.2);

  car.add(lowerBody, greenhouse);
  return car;
}

function createParkDeciduousTree(x: number, y: number, z: number): THREE.Group {
  const tree = new THREE.Group();
  tree.position.set(x, y, z);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 3.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
  );
  trunk.position.set(0, 1.75, 0);
  trunk.castShadow = true;

  const foliage = new THREE.Mesh(
    new THREE.DodecahedronGeometry(2.4, 1),
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 })
  );
  foliage.position.set(0, 4.2, 0);
  foliage.castShadow = true;

  tree.add(trunk, foliage);
  return tree;
}
