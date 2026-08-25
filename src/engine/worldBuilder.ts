import * as THREE from 'three';
import {
  getAsphaltTexture,
  getConcreteTexture,
  getExcavationSoilTexture,
  getSolarPanelTexture,
  getSteelTrussTexture,
  getTerrainTexture,
  getBuildingFacadeTexture,
} from './textures';
import { getTerrainHeight, MAP_SIZE, HALF_MAP } from './terrainEngine';
import { buildDiverseRegions } from './ruralAndUrbanBuilder';
import { buildCentralIconicDistrict } from './centralDistrictBuilder';

export interface WorldObjects {
  scene: THREE.Scene;
  interactiveObjects: THREE.Object3D[];
  animatables: {
    update: (time: number, delta: number) => void;
  }[];
  waterMesh: THREE.Mesh;
}

export function buildEngineeringWorld(scene: THREE.Scene): WorldObjects {
  const interactiveObjects: THREE.Object3D[] = [];
  const animatables: { update: (time: number, delta: number) => void }[] = [];

  // ==========================================
  // 1. 6KM x 6KM EXPANDED TERRAIN GEOMETRY
  // ==========================================
  const terrainTex = getTerrainTexture();
  terrainTex.repeat.set(60, 60);

  // 6000m x 6000m terrain mesh (6km x 6km).
  // 320x320 segments (~18.75m/cell) instead of the original 160x160 (~37.5m/cell):
  // the vehicle's ground height comes from the exact analytic getTerrainHeight()
  // function every frame, but the *rendered* mesh only samples that function at
  // its vertices and linearly interpolates between them. In steep areas (mountain
  // waves, the dam gorge, quarry terraces) a coarse grid diverges from the exact
  // curve by several meters, so the car visually sinks into slopes it is
  // mathematically standing on top of. Doubling resolution keeps that error small
  // relative to the terrain's shortest feature wavelength while staying cheap
  // enough to build once at startup (this loop runs off the render thread).
  const terrainGeo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 320, 320);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const h = getTerrainHeight(x, z);
    posAttr.setY(i, h);
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: terrainTex,
    roughness: 0.85,
    metalness: 0.05,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ==========================================
  // 2. 6KM RIVER WATER SURFACE
  // ==========================================
  const waterGeo = new THREE.PlaneGeometry(380, MAP_SIZE, 24, 120);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a4358,
    metalness: 0.1,
    roughness: 0.15,
    transmission: 0.7,
    transparent: true,
    opacity: 0.88,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(-30, -1.8, 0);
  waterMesh.receiveShadow = true;
  scene.add(waterMesh);

  // Animated gentle river water ripples
  animatables.push({
    update: (time) => {
      waterMesh.position.y = -1.8 + Math.sin(time * 1.2) * 0.08;
    },
  });

  // Reusable Materials
  const concretePylonTex = getConcreteTexture('pylon');
  concretePylonTex.repeat.set(2, 8);
  const pylonMat = new THREE.MeshStandardMaterial({
    map: concretePylonTex,
    roughness: 0.75,
    metalness: 0.1,
  });

  const bridgeDeckTex = getAsphaltTexture('bridge');
  bridgeDeckTex.repeat.set(1, 24);
  const bridgeDeckMat = new THREE.MeshStandardMaterial({
    map: bridgeDeckTex,
    roughness: 0.65,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x4a535e,
    metalness: 0.8,
    roughness: 0.35,
  });

  const cableMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde3,
    metalness: 0.9,
    roughness: 0.2,
  });

  // ==========================================
  // 3. MAIN CABLE-STAYED MEGA BRIDGE (Central Crossing)
  // ==========================================
  const deckLength = 520;
  const deckWidth = 24;
  const deckHeight = 12.2;
  const deckGeo = new THREE.BoxGeometry(deckLength, 2.5, deckWidth);
  const bridgeDeck = new THREE.Mesh(deckGeo, bridgeDeckMat);
  bridgeDeck.position.set(-20, deckHeight, 0);
  bridgeDeck.castShadow = true;
  bridgeDeck.receiveShadow = true;
  scene.add(bridgeDeck);

  // Bridge Guardrails
  const barrierGeo = new THREE.BoxGeometry(deckLength, 1.2, 0.6);
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0x8a939e, metalness: 0.6 });
  const northBarrier = new THREE.Mesh(barrierGeo, barrierMat);
  northBarrier.position.set(-20, deckHeight + 1.6, -deckWidth / 2 + 0.3);
  const southBarrier = new THREE.Mesh(barrierGeo, barrierMat);
  southBarrier.position.set(-20, deckHeight + 1.6, deckWidth / 2 - 0.3);
  scene.add(northBarrier, southBarrier);

  // Twin Modified H-shape Bridge Pylons (North z = -40, South z = +40)
  const pylonZCoords = [-40, 40];
  const pylonIds = ['struct-bridge-pylon-north', 'struct-bridge-pylon-south'];

  pylonZCoords.forEach((pz, idx) => {
    const pylonGroup = new THREE.Group();
    pylonGroup.position.set(-20, 0, pz);

    // Deep Pile Cap Base
    const pileCap = new THREE.Mesh(new THREE.BoxGeometry(22, 6, 16), pylonMat);
    pileCap.position.set(0, 0, 0);
    pileCap.castShadow = true;
    pylonGroup.add(pileCap);

    // Foundation Piles
    for (let px = -7; px <= 7; px += 14) {
      for (let pz_i = -5; pz_i <= 5; pz_i += 10) {
        const pileCylinder = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 14, 16), pylonMat);
        pileCylinder.position.set(px, -6, pz_i);
        pylonGroup.add(pileCylinder);
      }
    }

    // Tower Legs (125m apex)
    const legGeo = new THREE.BoxGeometry(4.5, 95, 5);
    const leftLeg = new THREE.Mesh(legGeo, pylonMat);
    leftLeg.position.set(0, 47.5, -7);
    leftLeg.rotation.x = 0.05;
    leftLeg.castShadow = true;

    const rightLeg = new THREE.Mesh(legGeo, pylonMat);
    rightLeg.position.set(0, 47.5, 7);
    rightLeg.rotation.x = -0.05;
    rightLeg.castShadow = true;

    // Cross Struts
    const lowerCrossBeam = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 16), pylonMat);
    lowerCrossBeam.position.set(0, deckHeight - 2, 0);
    const upperCrossBeam = new THREE.Mesh(new THREE.BoxGeometry(5, 3.5, 12), pylonMat);
    upperCrossBeam.position.set(0, 72, 0);

    pylonGroup.add(leftLeg, rightLeg, lowerCrossBeam, upperCrossBeam);

    // Inspection Platform & Gantry
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(4.5, deckHeight + 4, 0);
    const platformMesh = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.85 }));
    const yellowRail = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.2, 8.2), new THREE.MeshStandardMaterial({ color: 0xd68910, wireframe: true }));
    gantryGroup.add(platformMesh, yellowRail);
    pylonGroup.add(gantryGroup);

    // Stay Cables Array
    for (let c = 1; c <= 12; c++) {
      const anchorHeight = 44 + c * 3.6;
      const spanDistance = c * 18;
      createCable(pylonGroup, [0, anchorHeight, 0], [spanDistance, deckHeight + 1.2, 0], cableMat);
      createCable(pylonGroup, [0, anchorHeight, 0], [-spanDistance, deckHeight + 1.2, 0], cableMat);
    }

    pylonGroup.userData = { engineeringId: pylonIds[idx] };
    interactiveObjects.push(pylonGroup);
    scene.add(pylonGroup);
  });

  // Approach Piers
  for (let x = -260; x <= 220; x += 70) {
    if (Math.abs(x - (-20)) < 70) continue;
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.2, deckHeight, 16), pylonMat);
    pier.position.set(x, deckHeight / 2, 0);
    pier.castShadow = true;
    scene.add(pier);
  }

  // ==========================================
  // 4. NORTHERN CANYON HYDROELECTRIC DAM & RESERVOIR (x = -60, z = -1500)
  // ==========================================
  const damGroup = new THREE.Group();
  damGroup.position.set(-60, 0, -1500);
  damGroup.userData = { engineeringId: 'struct-hydroelectric-dam' };

  // Double-curvature concrete arch dam wall (Height 72m, width 280m)
  const damArchGeo = new THREE.CylinderGeometry(140, 160, 72, 32, 1, false, Math.PI * 0.7, Math.PI * 0.6);
  const damWall = new THREE.Mesh(damArchGeo, pylonMat);
  damWall.position.set(0, 36, 0);
  damWall.castShadow = true;
  damWall.receiveShadow = true;
  damGroup.add(damWall);

  // Dam Crest Roadway across the canyon (Width 12m)
  const crestRoad = new THREE.Mesh(
    new THREE.BoxGeometry(280, 4, 14),
    bridgeDeckMat
  );
  crestRoad.position.set(0, 72, 0);
  damGroup.add(crestRoad);

  // Spillway Chutes & Flip Bucket Ski-Jump Energy Dissipators
  for (let s = -30; s <= 30; s += 20) {
    const chute = new THREE.Mesh(new THREE.BoxGeometry(12, 45, 14), pylonMat);
    chute.rotation.x = -0.4;
    chute.position.set(s, 42, 28);
    damGroup.add(chute);
  }

  // Powerhouse Subterranean Generating Station
  const powerhouse = new THREE.Mesh(
    new THREE.BoxGeometry(90, 20, 35),
    new THREE.MeshStandardMaterial({ map: getBuildingFacadeTexture('industrial'), roughness: 0.7 })
  );
  powerhouse.position.set(0, 10, 55);
  powerhouse.castShadow = true;
  damGroup.add(powerhouse);

  // Penstock Steel Tubes (4 penstocks descending from crest to powerhouse)
  for (let p = -25; p <= 25; p += 16) {
    const penstock = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 60, 16), steelMat);
    penstock.rotation.x = 0.55;
    penstock.position.set(p, 36, 32);
    damGroup.add(penstock);
  }

  // High Mountain Reservoir Water Body
  const reservoirWater = new THREE.Mesh(
    new THREE.CircleGeometry(260, 32),
    new THREE.MeshPhysicalMaterial({ color: 0x0f4c64, roughness: 0.1, transmission: 0.6, transparent: true, opacity: 0.9 })
  );
  reservoirWater.rotation.x = -Math.PI / 2;
  reservoirWater.position.set(0, 68, -140);
  damGroup.add(reservoirWater);

  interactiveObjects.push(damGroup);
  scene.add(damGroup);

  // ==========================================
  // 5. HIGH-PEAK SUMMIT OBSERVATORY & SPACE RADAR (x = 1100, z = -2100, y = 145m)
  // ==========================================
  const obsGroup = new THREE.Group();
  const summitY = getTerrainHeight(1100, -2100);
  obsGroup.position.set(1100, summitY, -2100);
  obsGroup.userData = { engineeringId: 'struct-mountain-observatory' };

  // Concrete Base Plinth
  const obsPlinth = new THREE.Mesh(new THREE.CylinderGeometry(28, 32, 8, 24), pylonMat);
  obsPlinth.position.set(0, 4, 0);
  obsGroup.add(obsPlinth);

  // Rotating Astronomical Dome Building
  const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 12, 24), pylonMat);
  domeBase.position.set(-15, 14, 0);
  const domeHemisphere = new THREE.Mesh(
    new THREE.SphereGeometry(14, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.7, roughness: 0.25 })
  );
  domeHemisphere.position.set(-15, 20, 0);
  obsGroup.add(domeBase, domeHemisphere);

  // 32m Parabolic Deep Space Dish Antenna
  const dishSupport = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 4, 18, 16), steelMat);
  dishSupport.position.set(20, 13, 0);

  const dishGroup = new THREE.Group();
  dishGroup.name = 'radarDish';
  dishGroup.position.set(20, 22, 0);

  const dishBowl = new THREE.Mesh(
    new THREE.SphereGeometry(16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 3),
    new THREE.MeshStandardMaterial({ color: 0xdfe6e9, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })
  );
  dishBowl.rotation.x = Math.PI / 2 + 0.35;
  dishGroup.add(dishBowl);

  // Central Feed Horn
  const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 12, 12), steelMat);
  feedHorn.position.set(0, 6, -3);
  feedHorn.rotation.x = -0.35;
  dishGroup.add(feedHorn);

  obsGroup.add(dishSupport, dishGroup);
  interactiveObjects.push(obsGroup);
  scene.add(obsGroup);

  // Animate slow scanning radar dish
  animatables.push({
    update: (time) => {
      dishGroup.rotation.y = time * 0.15;
    },
  });

  // ==========================================
  // 6. 4.5KM INTERNATIONAL AIRPORT & CARGO HUB (x = 600, z = 450)
  // ==========================================
  const airportGroup = new THREE.Group();
  airportGroup.position.set(600, 0.6, 450);
  airportGroup.userData = { engineeringId: 'struct-international-airport' };

  // 4,500m x 60m Heavy Runway
  const runwayTex = getAsphaltTexture('highway');
  runwayTex.repeat.set(1, 80);
  const runwayMat = new THREE.MeshStandardMaterial({ map: runwayTex, roughness: 0.6 });
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(3600, 60).rotateX(-Math.PI / 2), runwayMat);
  runway.position.set(0, 0.05, 0);
  runway.receiveShadow = true;
  airportGroup.add(runway);

  // Parallel Taxiway
  const taxiway = new THREE.Mesh(new THREE.PlaneGeometry(3600, 30).rotateX(-Math.PI / 2), runwayMat);
  taxiway.position.set(0, 0.05, 90);
  taxiway.receiveShadow = true;
  airportGroup.add(taxiway);

  // 88m Air Traffic Control (ATC) Tower
  const atcTowerGroup = new THREE.Group();
  atcTowerGroup.position.set(-250, 0, 160);
  const atcShaft = new THREE.Mesh(new THREE.CylinderGeometry(4, 7, 78, 16), pylonMat);
  atcShaft.position.set(0, 39, 0);
  const atcCabin = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 9, 10, 16),
    new THREE.MeshPhysicalMaterial({ color: 0x0a192f, roughness: 0.1, transmission: 0.9, transparent: true })
  );
  atcCabin.position.set(0, 82, 0);
  atcTowerGroup.add(atcShaft, atcCabin);
  airportGroup.add(atcTowerGroup);

  // Cargo Terminal Hangars
  for (let h = -200; h <= 200; h += 120) {
    const hangar = new THREE.Mesh(
      new THREE.BoxGeometry(80, 22, 60),
      new THREE.MeshStandardMaterial({ map: getBuildingFacadeTexture('industrial'), roughness: 0.65 })
    );
    hangar.position.set(h, 11, 200);
    hangar.castShadow = true;
    airportGroup.add(hangar);
  }

  // Heavy Cargo Transport Aircraft parked on Apron
  const planeGroup = createCargoAircraft(-80, 0, 130);
  airportGroup.add(planeGroup);

  interactiveObjects.push(airportGroup);
  scene.add(airportGroup);

  // ==========================================
  // 7. SOUTH COASTAL SUSPENSION MEGA-BRIDGE (x = -800, z = 950, y = 18m)
  // ==========================================
  const suspGroup = new THREE.Group();
  suspGroup.position.set(-800, 0, 950);
  suspGroup.userData = { engineeringId: 'struct-suspension-bridge' };

  const suspSpanLength = 850;
  const suspDeckH = 18.0;
  const suspDeck = new THREE.Mesh(
    new THREE.BoxGeometry(suspSpanLength, 2.5, 22),
    bridgeDeckMat
  );
  suspDeck.position.set(0, suspDeckH, 0);
  suspDeck.castShadow = true;
  suspGroup.add(suspDeck);

  // Twin 120m Steel Suspension Towers (at x = -220 and x = +220)
  [-220, 220].forEach((tx) => {
    const towerMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 120, 26), pylonMat);
    towerMesh.position.set(tx, 60, 0);
    towerMesh.castShadow = true;
    suspGroup.add(towerMesh);

    // Catenary Main Cables (North and South)
    [-11, 11].forEach((cz_offset) => {
      const cablePoints = [
        new THREE.Vector3(tx - 220, suspDeckH + 2, cz_offset),
        new THREE.Vector3(tx - 110, 75, cz_offset),
        new THREE.Vector3(tx, 118, cz_offset),
        new THREE.Vector3(tx + 110, 75, cz_offset),
        new THREE.Vector3(tx + 220, suspDeckH + 2, cz_offset),
      ];
      const cableCurve = new THREE.CatmullRomCurve3(cablePoints);
      const catenaryGeo = new THREE.TubeGeometry(cableCurve, 32, 0.7, 8, false);
      const catenaryMesh = new THREE.Mesh(catenaryGeo, cableMat);
      suspGroup.add(catenaryMesh);
    });
  });

  interactiveObjects.push(suspGroup);
  scene.add(suspGroup);

  // ==========================================
  // 8. HIGH-SPEED RAIL VIADUCT & BULLET TRAIN (z = -600, x = -2600 to +2600)
  // ==========================================
  const hsrGroup = new THREE.Group();
  hsrGroup.position.set(0, 0, -600);
  hsrGroup.userData = { engineeringId: 'struct-hsr-viaduct' };

  const hsrLength = 4800;
  const hsrDeck = new THREE.Mesh(
    new THREE.BoxGeometry(hsrLength, 3, 14),
    pylonMat
  );
  hsrDeck.position.set(0, 14.5, 0);
  hsrGroup.add(hsrDeck);

  // Dual Rail Tracks
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 });
  [-3.5, 3.5].forEach((rx) => {
    const railTrack = new THREE.Mesh(new THREE.BoxGeometry(hsrLength, 0.4, 1.6), trackMat);
    railTrack.position.set(0, 16.2, rx);
    hsrGroup.add(railTrack);
  });

  // Viaduct Piers across 4.8km
  for (let px = -2200; px <= 2200; px += 75) {
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.0, 14.5, 14), pylonMat);
    pier.position.set(px, 7.25, 0);
    pier.castShadow = true;
    hsrGroup.add(pier);
  }

  // Aerodynamic High-Speed Bullet Train
  const bulletTrain = createBulletTrain(120, 16.5, -3.5);
  hsrGroup.add(bulletTrain);
  animatables.push({
    update: (time) => {
      // Train glides smoothly across the viaduct
      const trainX = ((time * 75) % 4000) - 2000;
      bulletTrain.position.x = trainX;
    },
  });

  interactiveObjects.push(hsrGroup);
  scene.add(hsrGroup);

  // ==========================================
  // 9. DOWNTOWN DEEP EXCAVATION PIT (x = 180, z = 120)
  // ==========================================
  const excavationGroup = new THREE.Group();
  excavationGroup.position.set(180, 0, 120);
  excavationGroup.userData = { engineeringId: 'struct-deep-excavation-pit' };

  const pitWidth = 80;
  const pitLength = 100;
  const pitDepth = 14;

  const matFoundation = new THREE.Mesh(
    new THREE.BoxGeometry(pitLength - 6, 2.5, pitWidth - 6),
    new THREE.MeshStandardMaterial({ map: getConcreteTexture('foundation'), roughness: 0.8 })
  );
  matFoundation.position.set(0, -pitDepth + 1.25, 0);
  matFoundation.receiveShadow = true;
  excavationGroup.add(matFoundation);

  // Soldier Pile Shoring Walls
  const shoringMat = new THREE.MeshStandardMaterial({ map: getConcreteTexture('panel'), roughness: 0.85 });
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(pitLength, pitDepth, 3), shoringMat);
  wallN.position.set(0, -pitDepth / 2, -pitWidth / 2);
  const wallS = new THREE.Mesh(new THREE.BoxGeometry(pitLength, pitDepth, 3), shoringMat);
  wallS.position.set(0, -pitDepth / 2, pitWidth / 2);
  const wallW = new THREE.Mesh(new THREE.BoxGeometry(3, pitDepth, pitWidth), shoringMat);
  wallW.position.set(-pitLength / 2, -pitDepth / 2, 0);
  const wallE = new THREE.Mesh(new THREE.BoxGeometry(3, pitDepth, pitWidth), shoringMat);
  wallE.position.set(pitLength / 2, -pitDepth / 2, 0);
  excavationGroup.add(wallN, wallS, wallW, wallE);

  // Cross Struts
  const strutMat = new THREE.MeshStandardMaterial({ color: 0x9a3822, metalness: 0.7, roughness: 0.4 });
  for (let z = -pitWidth / 2 + 15; z < pitWidth / 2; z += 25) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, pitLength, 12), strutMat);
    strut.rotation.z = Math.PI / 2;
    strut.position.set(0, -4, z);
    excavationGroup.add(strut);
  }

  // Tower Cranes
  const craneGroup1 = createTowerCrane(165, 0, 95, 65, 55, 'struct-tower-crane-alpha');
  interactiveObjects.push(craneGroup1);
  scene.add(craneGroup1);
  animatables.push({
    update: (time) => {
      const jib = craneGroup1.getObjectByName('craneJib');
      if (jib) jib.rotation.y = Math.sin(time * 0.2) * 0.7 + 0.5;
    },
  });

  const pumpTruck = createConcretePumpTruck(130, 0, 120);
  scene.add(pumpTruck);
  const excavator = createExcavator(170, -pitDepth + 1.5, 100);
  scene.add(excavator);

  interactiveObjects.push(excavationGroup);
  scene.add(excavationGroup);

  // ==========================================
  // 10. WATER TREATMENT PLANT & CLARIFIERS (x = -160, z = 130)
  // ==========================================
  const wtpGroup = new THREE.Group();
  wtpGroup.position.set(-160, 0, 130);
  wtpGroup.userData = { engineeringId: 'struct-water-clarifier-1' };

  for (let ci = 0; ci < 2; ci++) {
    const clarifierZ = ci === 0 ? -30 : 30;
    const clarifierGroup = new THREE.Group();
    clarifierGroup.position.set(0, 0, clarifierZ);

    const tankWall = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 4, 36, 1, true), pylonMat);
    tankWall.position.set(0, 2, 0);
    const clarifierWater = new THREE.Mesh(
      new THREE.CircleGeometry(19.5, 36),
      new THREE.MeshStandardMaterial({ color: 0x1b5e52, roughness: 0.1, metalness: 0.2 })
    );
    clarifierWater.rotation.x = -Math.PI / 2;
    clarifierWater.position.set(0, 3.2, 0);

    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(0, 4.2, 0);
    const bridgeWalkway = new THREE.Mesh(new THREE.BoxGeometry(39, 0.4, 2.2), new THREE.MeshStandardMaterial({ color: 0x3d444d, metalness: 0.7 }));
    const bridgeRailing = new THREE.Mesh(new THREE.BoxGeometry(39, 1.2, 2.4), new THREE.MeshStandardMaterial({ color: 0xd4ac0d, wireframe: true }));
    bridgeGroup.add(bridgeWalkway, bridgeRailing);

    clarifierGroup.add(tankWall, clarifierWater, bridgeGroup);
    wtpGroup.add(clarifierGroup);

    animatables.push({
      update: (time) => {
        bridgeGroup.rotation.y = time * 0.08 * (ci === 0 ? 1 : -1);
      },
    });
  }

  interactiveObjects.push(wtpGroup);
  scene.add(wtpGroup);

  // ==========================================
  // 11. 400KV SUBSTATION & SOLAR PV UTILITY FARM (x = -280, z = -140)
  // ==========================================
  const energyGroup = new THREE.Group();
  energyGroup.position.set(-280, 0, -140);
  energyGroup.userData = { engineeringId: 'struct-substation-transformer' };

  const transformerBody = new THREE.Mesh(new THREE.BoxGeometry(10, 7, 8), new THREE.MeshStandardMaterial({ color: 0x3d434a, metalness: 0.8, roughness: 0.3 }));
  transformerBody.position.set(0, 3.5, 0);
  energyGroup.add(transformerBody);

  interactiveObjects.push(energyGroup);
  scene.add(energyGroup);

  // Solar PV Array
  const solarGroup = new THREE.Group();
  solarGroup.position.set(-230, 0, -170);
  solarGroup.userData = { engineeringId: 'struct-solar-pv-array' };

  const pvTex = getSolarPanelTexture();
  pvTex.repeat.set(4, 2);
  const pvMat = new THREE.MeshStandardMaterial({ map: pvTex, roughness: 0.15, metalness: 0.85 });

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 8; col++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 5), pvMat);
      panel.position.set(col * 14 - 50, 2.5, row * 8 - 25);
      panel.rotation.x = 0.45;
      panel.castShadow = true;
      solarGroup.add(panel);
    }
  }
  interactiveObjects.push(solarGroup);
  scene.add(solarGroup);

  // ==========================================
  // 12. CONTAINER PORT & STS CRANES (x = 320, z = -180)
  // ==========================================
  const portGroup = new THREE.Group();
  portGroup.position.set(320, 0, -180);
  portGroup.userData = { engineeringId: 'struct-port-sts-crane' };

  const quayApron = new THREE.Mesh(new THREE.BoxGeometry(180, 4, 90), pylonMat);
  quayApron.position.set(0, 0, 0);
  portGroup.add(quayApron);

  for (let sc = 0; sc < 2; sc++) {
    const stsCrane = createSTSGantryCrane(sc * 55 - 28, 2, -20);
    portGroup.add(stsCrane);
  }
  const shipGroup = createCargoShip(0, -1, -65);
  portGroup.add(shipGroup);

  interactiveObjects.push(portGroup);
  scene.add(portGroup);

  // ==========================================
  // 13. SOUTHERN RIDGE WIND TURBINES ARRAY (12 units across z = 1200 to 2200)
  // ==========================================
  const windCoords = [
    [-1200, 1400],
    [-800, 1600],
    [-400, 1500],
    [0, 1650],
    [400, 1550],
    [800, 1700],
    [1200, 1450],
    [-600, 2100],
    [0, 2200],
    [600, 2050],
  ];

  windCoords.forEach(([wx, wz]) => {
    const wy = getTerrainHeight(wx, wz);
    const turbine = createWindTurbine(wx, wy, wz);
    scene.add(turbine);
    animatables.push({
      update: (time) => {
        const rotor = turbine.getObjectByName('turbineRotor');
        if (rotor) rotor.rotation.z = time * 1.6;
      },
    });
  });

  // ==========================================
  // 14. METROPOLITAN CBD SKYSCRAPERS & FINANCIAL DISTRICT
  // ==========================================
  const modernFacade = getBuildingFacadeTexture('modern');
  modernFacade.repeat.set(2, 6);
  const commercialFacade = getBuildingFacadeTexture('commercial');
  commercialFacade.repeat.set(2, 4);

  const cityDistricts = [
    { cx: -180, cz: -80, count: 18, baseH: 60 },
    { cx: 160, cz: -80, count: 24, baseH: 75 },
    { cx: 80, cz: 200, count: 16, baseH: 45 },
    { cx: 350, cz: 160, count: 12, baseH: 40 },
  ];

  cityDistricts.forEach((dist) => {
    for (let b = 0; b < dist.count; b++) {
      const bx = dist.cx + (Math.random() - 0.5) * 140;
      const bz = dist.cz + (Math.random() - 0.5) * 140;
      const bw = Math.random() * 20 + 16;
      const bd = Math.random() * 20 + 16;
      const bh = Math.random() * dist.baseH + 25;
      const by = getTerrainHeight(bx, bz);

      const isModern = Math.random() > 0.4;
      const bMat = new THREE.MeshStandardMaterial({
        map: isModern ? modernFacade : commercialFacade,
        roughness: isModern ? 0.2 : 0.7,
        metalness: isModern ? 0.8 : 0.1,
      });

      const building = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bMat);
      building.position.set(bx, by + bh / 2, bz);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);
    }
  });

  // ==========================================
  // 15. 6KM HIGHWAY ARTERIALS & ROAD NETWORK
  // ==========================================
  const roadTex = getAsphaltTexture('road');
  roadTex.repeat.set(1, 60);
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.7 });

  // Main East-West Highway Arterial (spanning 4km)
  const mainRoadEW = new THREE.Mesh(new THREE.PlaneGeometry(16, 4200).rotateX(-Math.PI / 2), roadMat);
  mainRoadEW.rotation.y = Math.PI / 2;
  mainRoadEW.position.set(0, 0.55, 70);
  mainRoadEW.receiveShadow = true;
  scene.add(mainRoadEW);

  // Main North-South Highway Avenue (spanning 4km)
  const mainRoadNS = new THREE.Mesh(new THREE.PlaneGeometry(16, 4200).rotateX(-Math.PI / 2), roadMat);
  mainRoadNS.position.set(100, 0.55, 0);
  mainRoadNS.receiveShadow = true;
  scene.add(mainRoadNS);

  // Streetlights along central roads
  for (let sz = -320; sz <= 320; sz += 40) {
    const lamp1 = createStreetLight(90, 0.5, sz);
    const lamp2 = createStreetLight(110, 0.5, sz);
    scene.add(lamp1, lamp2);
  }

  // Real Vegetation & Trees
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2e4f25, roughness: 0.9 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.95 });

  for (let t = 0; t < 220; t++) {
    const tx = (Math.random() - 0.5) * 1800;
    const tz = (Math.random() - 0.5) * 1800;
    if (Math.abs(tx) < 70 && Math.abs(tz) < 250) continue; // Avoid river & road

    const ty = getTerrainHeight(tx, tz);
    if (ty < 0) continue; // avoid water

    const tree = new THREE.Group();
    tree.position.set(tx, ty, tz);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 4, 8), trunkMat);
    trunk.position.set(0, 2, 0);
    const leaves = new THREE.ConeGeometry(2.8, 6, 8);
    const leafMesh = new THREE.Mesh(leaves, foliageMat);
    leafMesh.position.set(0, 5.5, 0);
    tree.add(trunk, leafMesh);
    scene.add(tree);
  }

  // ==========================================
  // 16. BUILD DIVERSE REGIONS (VILLAGE, FARMLAND, ACTIVE MACHINERY, CURVED ROADS)
  // ==========================================
  const diverseRegions = buildDiverseRegions(scene);
  interactiveObjects.push(...diverseRegions.interactiveObjects);
  animatables.push(...diverseRegions.animatables);

  // ==========================================
  // 17. BUILD STEP 1 ICONIC DISTRICT (FLYOVER, MOSQUE, TEMPLE, HOSPITAL, CRANE, GAS/EV, PARK)
  // ==========================================
  const centralDistrict = buildCentralIconicDistrict(scene);
  interactiveObjects.push(...centralDistrict.interactiveObjects);
  animatables.push(...centralDistrict.animatables);

  return {
    scene,
    interactiveObjects,
    animatables,
    waterMesh,
  };
}

// ==========================================
// HELPER PROCEDURAL CONSTRUCTORS
// ==========================================

function createCable(parent: THREE.Group, start: [number, number, number], end: [number, number, number], mat: THREE.Material) {
  const p1 = new THREE.Vector3(...start);
  const p2 = new THREE.Vector3(...end);
  const dist = p1.distanceTo(p2);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, dist, 8), mat);
  cable.position.copy(p1.clone().add(p2).multiplyScalar(0.5));
  cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
  parent.add(cable);
}

function createWindTurbine(x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.3 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 3.2, 85, 16), whiteMat);
  tower.position.set(0, 42.5, 0);
  tower.castShadow = true;

  const nacelle = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4, 9), whiteMat);
  nacelle.position.set(0, 85, 0);

  const rotor = new THREE.Group();
  rotor.name = 'turbineRotor';
  rotor.position.set(0, 85, 4.8);

  const hub = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), whiteMat);
  rotor.add(hub);

  for (let b = 0; b < 3; b++) {
    const angle = (b * 2 * Math.PI) / 3;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.8, 42, 0.2), whiteMat);
    blade.position.set(Math.sin(angle) * 21, Math.cos(angle) * 21, 0);
    blade.rotation.z = -angle;
    rotor.add(blade);
  }

  group.add(tower, nacelle, rotor);
  return group;
}

function createCargoAircraft(x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const planeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });

  // Fuselage
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 52, 16), planeMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.set(0, 4.5, 0);
  fuselage.castShadow = true;

  // Wings
  const wings = new THREE.Mesh(new THREE.BoxGeometry(58, 0.6, 8), planeMat);
  wings.position.set(0, 4.5, -2);
  wings.castShadow = true;

  // Tail Fin
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 11, 7), darkMat);
  tail.position.set(0, 9.5, -22);

  group.add(fuselage, wings, tail);
  return group;
}

function createBulletTrain(x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.7 });
  const blueStripe = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, transmission: 0.8 });

  // 8-car high-speed train body
  for (let c = 0; c < 6; c++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(26, 3.8, 3.4), whiteMat);
    car.position.set(c * 27 - 68, 1.9, 0);
    car.castShadow = true;

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(26.1, 0.5, 3.42), blueStripe);
    stripe.position.set(c * 27 - 68, 1.2, 0);

    const windowStrip = new THREE.Mesh(new THREE.BoxGeometry(24, 0.6, 3.44), glassMat);
    windowStrip.position.set(c * 27 - 68, 2.4, 0);

    group.add(car, stripe, windowStrip);
  }

  return group;
}

function createSTSGantryCrane(x: number, y: number, z: number): THREE.Group {
  const craneGroup = new THREE.Group();
  craneGroup.position.set(x, y, z);

  const craneMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.5 });
  const boomMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });

  // Gantry Portal Legs
  const legGeo = new THREE.BoxGeometry(2.5, 48, 2.5);
  for (let lx of [-12, 12]) {
    for (let lz of [-8, 8]) {
      const leg = new THREE.Mesh(legGeo, craneMat);
      leg.position.set(lx, 24, lz);
      leg.castShadow = true;
      craneGroup.add(leg);
    }
  }

  // Horizontal Crane Boom (Outreach over ship)
  const boom = new THREE.Mesh(new THREE.BoxGeometry(28, 4, 90), boomMat);
  boom.position.set(0, 48, -15);
  boom.castShadow = true;
  craneGroup.add(boom);

  return craneGroup;
}

function createCargoShip(x: number, y: number, z: number): THREE.Group {
  const ship = new THREE.Group();
  ship.position.set(x, y, z);

  const hullMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });

  // Ship Hull (180m container feeder vessel)
  const hull = new THREE.Mesh(new THREE.BoxGeometry(32, 14, 160), hullMat);
  hull.position.set(0, 4, 0);
  hull.castShadow = true;

  const deck = new THREE.Mesh(new THREE.BoxGeometry(31, 1, 158), deckMat);
  deck.position.set(0, 11, 0);

  // Superstructure Bridge at stern
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(26, 18, 24), whiteMat);
  bridge.position.set(0, 20, 55);
  bridge.castShadow = true;

  ship.add(hull, deck, bridge);
  return ship;
}

function createTowerCrane(x: number, y: number, z: number, height: number, jibRadius: number, engineeringId?: string): THREE.Group {
  const crane = new THREE.Group();
  crane.position.set(x, y, z);
  if (engineeringId) crane.userData = { engineeringId };

  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.4, metalness: 0.6 });
  const mast = new THREE.Mesh(new THREE.BoxGeometry(3, height, 3), yellowMat);
  mast.position.set(0, height / 2, 0);
  mast.castShadow = true;

  const jibGroup = new THREE.Group();
  jibGroup.name = 'craneJib';
  jibGroup.position.set(0, height, 0);

  const jib = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, jibRadius), yellowMat);
  jib.position.set(0, 0, jibRadius / 2 - 10);
  jib.castShadow = true;

  const counterJib = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 18), yellowMat);
  counterJib.position.set(0, 0, -9);

  jibGroup.add(jib, counterJib);
  crane.add(mast, jibGroup);
  return crane;
}

function createConcretePumpTruck(x: number, y: number, z: number): THREE.Group {
  const truck = new THREE.Group();
  truck.position.set(x, y, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 10), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
  body.position.set(0, 1.5, 0);
  truck.add(body);
  return truck;
}

function createExcavator(x: number, y: number, z: number): THREE.Group {
  const excavator = new THREE.Group();
  excavator.position.set(x, y, z);
  const track = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 5), new THREE.MeshStandardMaterial({ color: 0x1c1917 }));
  track.position.set(0, 0.6, 0);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 3), new THREE.MeshStandardMaterial({ color: 0xeab308 }));
  cab.position.set(0, 2.2, 0);
  excavator.add(track, cab);
  return excavator;
}

function createStreetLight(x: number, y: number, z: number): THREE.Group {
  const light = new THREE.Group();
  light.position.set(x, y, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 8), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 }));
  pole.position.set(0, 4.5, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x334155 }));
  head.position.set(0, 9, 0.5);
  light.add(pole, head);
  return light;
}
