import * as THREE from 'three';
import { getTerrainHeight } from './terrainEngine';
import { getBuildingFacadeTexture, getConcreteTexture } from './textures';
import { createCurvedRoadMesh, RoadSplinePoint } from './curvedRoadEngine';

export interface SceneryObjects {
  interactiveObjects: THREE.Object3D[];
  animatables: { update: (time: number, delta: number) => void }[];
}

export function buildDiverseRegions(scene: THREE.Scene): SceneryObjects {
  const interactiveObjects: THREE.Object3D[] = [];
  const animatables: { update: (time: number, delta: number) => void }[] = [];

  // =========================================================================
  // 1. WINDING & IRREGULAR ROAD NETWORKS ACROSS 6KM
  // =========================================================================

  // A. Northern Mountain Serpentine Pass (Climbing up to Dam and Summit Observatory)
  const mountainPassPoints: RoadSplinePoint[] = [
    { x: -60, z: -800 },
    { x: -140, z: -980 },
    { x: -220, z: -1120 },
    { x: -110, z: -1280 },
    { x: -60, z: -1500 }, // Passes directly through Hydro Dam Crest
    { x: 120, z: -1640 },
    { x: 380, z: -1760 },
    { x: 620, z: -1880 },
    { x: 880, z: -1990 },
    { x: 1040, z: -2070 },
    { x: 1100, z: -2100 }, // Summit Observatory Lookout
  ];
  const mountainRoad = createCurvedRoadMesh(mountainPassPoints, 11, 'road', 140);
  scene.add(mountainRoad);

  // B. Rural Village Loop & Backroads
  const villageRoadPoints: RoadSplinePoint[] = [
    { x: -450, z: -400 },
    { x: -580, z: -480 },
    { x: -740, z: -560 },
    { x: -920, z: -620 },
    { x: -1100, z: -580 }, // Village Square
    { x: -1240, z: -480 },
    { x: -1320, z: -320 },
    { x: -1220, z: -180 }, // Curving around scenic pond
    { x: -1020, z: -120 },
    { x: -840, z: -160 },
    { x: -680, z: -260 },
    { x: -520, z: -340 },
  ];
  const villageRoad = createCurvedRoadMesh(villageRoadPoints, 8.5, 'road', 130);
  scene.add(villageRoad);

  // C. Agricultural Country Lanes & Farmland Spine (Connecting Wheat/Corn fields to Highway)
  const farmLanePoints1: RoadSplinePoint[] = [
    { x: 350, z: -400 },
    { x: 550, z: -480 },
    { x: 780, z: -520 },
    { x: 1050, z: -490 }, // Big Farm Headquarters
    { x: 1320, z: -420 },
    { x: 1580, z: -320 },
    { x: 1800, z: -180 },
  ];
  const farmLane1 = createCurvedRoadMesh(farmLanePoints1, 7.5, 'rural_dirt', 100);
  scene.add(farmLane1);

  const farmLanePoints2: RoadSplinePoint[] = [
    { x: 1050, z: -490 },
    { x: 1120, z: -680 },
    { x: 1240, z: -920 },
    { x: 1380, z: -1140 },
    { x: 1520, z: -1360 }, // Upper grain silo sector
  ];
  const farmLane2 = createCurvedRoadMesh(farmLanePoints2, 6.5, 'rural_dirt', 80);
  scene.add(farmLane2);

  // D. South Coastal Scenic Highway (Curving along the ocean ridge to suspension bridge)
  const coastalHighwayPoints: RoadSplinePoint[] = [
    { x: -2100, z: 880 },
    { x: -1600, z: 920 },
    { x: -1150, z: 950 },
    { x: -800, z: 950 }, // Suspension Bridge
    { x: -450, z: 920 },
    { x: -120, z: 840 },
    { x: 260, z: 740 },
    { x: 650, z: 620 },
    { x: 1100, z: 540 },
    { x: 1600, z: 510 },
  ];
  const coastalRoad = createCurvedRoadMesh(coastalHighwayPoints, 14, 'highway', 150);
  scene.add(coastalRoad);

  // =========================================================================
  // 2. AGRICULTURAL / FARMING AREAS (x = 700 to 1800, z = -1400 to -200)
  // =========================================================================
  const farmZoneGroup = new THREE.Group();
  farmZoneGroup.position.set(1100, 0, -600);
  farmZoneGroup.userData = { engineeringId: 'zone-agricultural-valley' };

  // Vast Multi-Crop Parcels
  // 1. Golden Wheat Fields with Hay Bales
  const wheatGeo = new THREE.PlaneGeometry(360, 240, 16, 16);
  wheatGeo.rotateX(-Math.PI / 2);
  const wheatPos = wheatGeo.attributes.position;
  for (let i = 0; i < wheatPos.count; i++) {
    const wx = wheatPos.getX(i) + 1100;
    const wz = wheatPos.getZ(i) - 600;
    wheatPos.setY(i, getTerrainHeight(wx, wz) + 0.1);
  }
  wheatGeo.computeVertexNormals();

  const wheatMat = new THREE.MeshStandardMaterial({
    color: 0xdfa138, // Golden ripe wheat
    roughness: 0.9,
    metalness: 0.05,
  });
  const wheatField = new THREE.Mesh(wheatGeo, wheatMat);
  wheatField.receiveShadow = true;
  scene.add(wheatField);

  // Scatter Round Hay Bales across the wheat field
  const hayMat = new THREE.MeshStandardMaterial({ color: 0xe5a643, roughness: 0.95 });
  const hayGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.2, 14);
  hayGeo.rotateZ(Math.PI / 2);

  for (let h = 0; h < 24; h++) {
    const hx = 1100 + (Math.random() - 0.5) * 300;
    const hz = -600 + (Math.random() - 0.5) * 190;
    const hy = getTerrainHeight(hx, hz) + 0.6;

    const hayBale = new THREE.Mesh(hayGeo, hayMat);
    hayBale.position.set(hx, hy, hz);
    hayBale.rotation.y = Math.random() * Math.PI;
    hayBale.castShadow = true;
    scene.add(hayBale);
  }

  // 2. Green Corn Fields in Furrows (x = 1500, z = -750)
  const cornGeo = new THREE.PlaneGeometry(320, 260, 16, 16);
  cornGeo.rotateX(-Math.PI / 2);
  const cornPos = cornGeo.attributes.position;
  for (let i = 0; i < cornPos.count; i++) {
    const cx = cornPos.getX(i) + 1500;
    const cz = cornPos.getZ(i) - 750;
    cornPos.setY(i, getTerrainHeight(cx, cz) + 0.1);
  }
  cornGeo.computeVertexNormals();

  const cornMat = new THREE.MeshStandardMaterial({
    color: 0x3d6b2c, // Lush Corn Green
    roughness: 0.85,
  });
  const cornField = new THREE.Mesh(cornGeo, cornMat);
  cornField.receiveShadow = true;
  scene.add(cornField);

  // Corn Plant Furrow Rows
  const cornRowMat = new THREE.MeshStandardMaterial({ color: 0x2d531e, roughness: 0.9 });
  for (let r = -110; r <= 110; r += 8) {
    const rowGeo = new THREE.BoxGeometry(290, 0.7, 1.2);
    const rowMesh = new THREE.Mesh(rowGeo, cornRowMat);
    const rX = 1500;
    const rZ = -750 + r;
    const rY = getTerrainHeight(rX, rZ) + 0.4;
    rowMesh.position.set(rX, rY, rZ);
    scene.add(rowMesh);
  }

  // 3. Purple Lavender & Golden Canola Ribbon Fields (x = 800, z = -750)
  const lavenderMat = new THREE.MeshStandardMaterial({ color: 0x7c4d9f, roughness: 0.9 });
  const canolaMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.85 });

  for (let s = 0; s < 8; s++) {
    const stripZ = -750 + s * 22;
    const isLavender = s % 2 === 0;
    const stripGeo = new THREE.PlaneGeometry(240, 18);
    stripGeo.rotateX(-Math.PI / 2);

    const sPos = stripGeo.attributes.position;
    for (let i = 0; i < sPos.count; i++) {
      const sx = sPos.getX(i) + 750;
      const sz = sPos.getZ(i) + stripZ;
      sPos.setY(i, getTerrainHeight(sx, sz) + 0.12);
    }
    stripGeo.computeVertexNormals();

    const stripMesh = new THREE.Mesh(stripGeo, isLavender ? lavenderMat : canolaMat);
    stripMesh.receiveShadow = true;
    scene.add(stripMesh);
  }

  // 4. Farm Headquarters (Barn, Silos, Implement Shed, Windmill)
  const barnX = 1050;
  const barnZ = -440;
  const barnY = getTerrainHeight(barnX, barnZ);

  const barnGroup = createFarmBarn(barnX, barnY, barnZ);
  farmZoneGroup.add(barnGroup);

  const siloGroup = createGrainSiloComplex(barnX + 45, barnY, barnZ - 10);
  farmZoneGroup.add(siloGroup);

  const farmWindmill = createFarmWindmill(barnX - 35, barnY, barnZ + 25);
  farmZoneGroup.add(farmWindmill);
  animatables.push({
    update: (time) => {
      const blades = farmWindmill.getObjectByName('windmillBlades');
      if (blades) blades.rotation.z = time * 0.9;
    },
  });

  interactiveObjects.push(farmZoneGroup);
  scene.add(farmZoneGroup);

  // =========================================================================
  // 3. ACTIVE AGRICULTURAL MACHINERY & FARMERS IN FIELDS
  // =========================================================================

  // A. Active Green Farm Tractor with Disc Plow working in Corn Field (x ~ 1480, z ~ -750)
  const tractorGroup = createHeavyFarmTractor(1480, getTerrainHeight(1480, -750), -750, 0x15803d);
  scene.add(tractorGroup);

  // Animate tractor driving up and down corn furrows with spinning wheels and rotary plow
  animatables.push({
    update: (time) => {
      const loopTime = 32; // 32 seconds round trip
      const tNorm = (time % loopTime) / loopTime;
      const goingForward = tNorm < 0.5;
      const progress = goingForward ? tNorm * 2 : (1 - (tNorm - 0.5) * 2);

      const curX = 1380 + progress * 240;
      const curZ = -750 + (goingForward ? -15 : 15);
      const curY = getTerrainHeight(curX, curZ);
      const heading = goingForward ? 0 : Math.PI;

      tractorGroup.position.set(curX, curY, curZ);
      tractorGroup.rotation.y = heading + Math.PI / 2;

      // Rotate tractor wheels
      const wheels = tractorGroup.getObjectByName('tractorWheels');
      if (wheels) {
        wheels.children.forEach((w) => {
          w.rotation.x += goingForward ? 0.12 : -0.12;
        });
      }

      // Oscillate plow blades
      const plow = tractorGroup.getObjectByName('furrowPlow');
      if (plow) {
        plow.rotation.z = Math.sin(time * 6) * 0.08;
      }
    },
  });

  // B. Active Red Combine Harvester working in Golden Wheat Field (x ~ 1100, z ~ -600)
  const combineGroup = createCombineHarvester(1100, getTerrainHeight(1100, -600), -600);
  scene.add(combineGroup);

  animatables.push({
    update: (time) => {
      const loopTime = 42;
      const tNorm = (time % loopTime) / loopTime;
      const forward = tNorm < 0.5;
      const progress = forward ? tNorm * 2 : (1 - (tNorm - 0.5) * 2);

      const cX = 1000 + progress * 200;
      const cZ = -600 + (forward ? -20 : 20);
      const cY = getTerrainHeight(cX, cZ);

      combineGroup.position.set(cX, cY, cZ);
      combineGroup.rotation.y = forward ? Math.PI / 2 : -Math.PI / 2;

      // Spin front harvesting reel
      const reel = combineGroup.getObjectByName('harvestReel');
      if (reel) {
        reel.rotation.x -= 0.15;
      }
    },
  });

  // C. Farmers / Agricultural Workers actively in the fields
  const farmerCoords = [
    { x: 1040, z: -430, rot: 0.5, name: 'Farmer Dan (Barn Manager)' },
    { x: 1460, z: -730, rot: -1.2, name: 'Farmer Sarah (Corn Specialist)' },
    { x: 1080, z: -580, rot: 2.1, name: 'Farmer John (Wheat Harvester)' },
    { x: 820, z: -730, rot: 0.8, name: 'Farmer Elena (Lavender Care)' },
  ];

  farmerCoords.forEach((fc) => {
    const fy = getTerrainHeight(fc.x, fc.z);
    const farmer = createFarmerModel(fc.x, fy, fc.z, fc.rot);
    farmer.userData = { engineeringId: 'worker-farm', workerName: fc.name };
    scene.add(farmer);
    interactiveObjects.push(farmer);
  });

  // =========================================================================
  // 4. VILLAGE / RURAL AREAS (x = -1100, z = -400)
  // =========================================================================
  const villageGroup = new THREE.Group();
  villageGroup.position.set(-1100, 0, -400);
  villageGroup.userData = { engineeringId: 'zone-countryside-village' };

  // A. Village Houses & Cottages
  const houseCoords = [
    { x: -1040, z: -550, rot: 0.2, style: 'timber' },
    { x: -1160, z: -570, rot: -0.4, style: 'stone' },
    { x: -1280, z: -490, rot: 0.8, style: 'brick' },
    { x: -1340, z: -380, rot: 1.4, style: 'timber' },
    { x: -1260, z: -260, rot: 2.1, style: 'stone' },
    { x: -1140, z: -210, rot: -2.8, style: 'brick' },
    { x: -980, z: -250, rot: -1.8, style: 'timber' },
    { x: -920, z: -370, rot: -0.9, style: 'stone' },
    { x: -840, z: -480, rot: 0.3, style: 'brick' },
    { x: -1000, z: -450, rot: 0.6, style: 'timber' },
  ];

  houseCoords.forEach((hc) => {
    const hy = getTerrainHeight(hc.x, hc.z);
    const house = createVillageCottage(hc.x, hy, hc.z, hc.rot, hc.style as any);
    house.userData = { engineeringId: 'struct-village-cottage' };
    scene.add(house);
    interactiveObjects.push(house);
  });

  // B. Village Scenic Pond with Water Reflection & Dock (x = -1200, z = -140)
  const pondX = -1200;
  const pondZ = -140;
  const pondY = getTerrainHeight(pondX, pondZ) + 0.2;

  const pondGeo = new THREE.CircleGeometry(65, 32);
  pondGeo.rotateX(-Math.PI / 2);
  const pondMat = new THREE.MeshPhysicalMaterial({
    color: 0x1b4965,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.8,
    transparent: true,
    opacity: 0.9,
  });
  const pondMesh = new THREE.Mesh(pondGeo, pondMat);
  pondMesh.position.set(pondX, pondY, pondZ);
  pondMesh.receiveShadow = true;
  scene.add(pondMesh);

  // Water lily pads on pond
  const lilyMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 });
  const lilyGeo = new THREE.CircleGeometry(1.6, 12);
  lilyGeo.rotateX(-Math.PI / 2);

  for (let lp = 0; lp < 18; lp++) {
    const lx = pondX + (Math.random() - 0.5) * 80;
    const lz = pondZ + (Math.random() - 0.5) * 80;
    const lily = new THREE.Mesh(lilyGeo, lilyMat);
    lily.position.set(lx, pondY + 0.05, lz);
    scene.add(lily);
  }

  // Wooden Fishing Dock on pond
  const dockGeo = new THREE.BoxGeometry(4, 0.4, 18);
  const dockMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const dock = new THREE.Mesh(dockGeo, dockMat);
  dock.position.set(pondX + 45, pondY + 0.3, pondZ);
  dock.rotation.y = 0.4;
  dock.castShadow = true;
  scene.add(dock);

  // C. Traditional Village Windmill
  const windmill = createVillageWindmill(-1080, getTerrainHeight(-1080, -620), -620);
  scene.add(windmill);
  animatables.push({
    update: (time) => {
      const rotor = windmill.getObjectByName('windmillSails');
      if (rotor) rotor.rotation.z = time * 0.7;
    },
  });

  // D. Village General Store & Antique Gas Pump
  const storeX = -1060;
  const storeZ = -340;
  const storeY = getTerrainHeight(storeX, storeZ);
  const store = createVillageStore(storeX, storeY, storeZ);
  scene.add(store);

  interactiveObjects.push(villageGroup);
  scene.add(villageGroup);

  // =========================================================================
  // 5. URBAN / CITY COMMERCIAL AREAS & PLAZAS (x = 220, z = 0)
  // =========================================================================
  const urbanPlazaGroup = new THREE.Group();
  urbanPlazaGroup.position.set(220, 0, 0);
  urbanPlazaGroup.userData = { engineeringId: 'zone-metropolitan-plaza' };

  // A. Paved Grand Civic Plaza with 3-Tier Fountain
  const plazaY = getTerrainHeight(220, 0) + 0.15;
  const plazaGeo = new THREE.PlaneGeometry(90, 90);
  plazaGeo.rotateX(-Math.PI / 2);
  const plazaMat = new THREE.MeshStandardMaterial({
    map: getConcreteTexture('panel'),
    roughness: 0.6,
  });
  const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
  plazaMesh.position.set(220, plazaY, 0);
  plazaMesh.receiveShadow = true;
  scene.add(plazaMesh);

  // 3-Tier Central Fountain
  const fountainGroup = createCivicFountain(220, plazaY, 0);
  scene.add(fountainGroup);
  animatables.push({
    update: (time) => {
      const water = fountainGroup.getObjectByName('fountainWater');
      if (water) {
        water.scale.set(1 + Math.sin(time * 3) * 0.05, 1, 1 + Math.sin(time * 3) * 0.05);
      }
    },
  });

  // B. Retail Storefronts with Colorful Awnings along City Boulevard
  const shopZCoords = [-60, -30, 30, 60];
  shopZCoords.forEach((sz, idx) => {
    const shop = createStorefront(170, getTerrainHeight(170, sz), sz, idx);
    scene.add(shop);
  });

  interactiveObjects.push(urbanPlazaGroup);
  scene.add(urbanPlazaGroup);

  return {
    interactiveObjects,
    animatables,
  };
}

// =========================================================================
// PROCEDURAL ARCHITECTURAL & VEHICLE CONSTRUCTORS
// =========================================================================

function createFarmBarn(x: number, y: number, z: number): THREE.Group {
  const barn = new THREE.Group();
  barn.position.set(x, y, z);

  const redBarnMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 });
  const whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });

  // Main Barn Body (Width 28m, Length 42m, Height 14m)
  const barnBody = new THREE.Mesh(new THREE.BoxGeometry(28, 12, 42), redBarnMat);
  barnBody.position.set(0, 6, 0);
  barnBody.castShadow = true;
  barnBody.receiveShadow = true;

  // Gambrel Roof
  const roofGeo = new THREE.CylinderGeometry(15, 15, 43, 6);
  roofGeo.rotateZ(Math.PI / 2);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 15, 0);
  roof.castShadow = true;

  // White Cross Doors (X on barn doors)
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 4, 21.1);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 0.4), whiteTrimMat);
  const crossX1 = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.4, 0.5), redBarnMat);
  crossX1.rotation.z = 0.78;
  const crossX2 = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.4, 0.5), redBarnMat);
  crossX2.rotation.z = -0.78;
  doorGroup.add(doorPanel, crossX1, crossX2);

  barn.add(barnBody, roof, doorGroup);
  return barn;
}

function createGrainSiloComplex(x: number, y: number, z: number): THREE.Group {
  const siloGroup = new THREE.Group();
  siloGroup.position.set(x, y, z);

  const metalSiloMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.3 });
  const steelFrameMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });

  for (let s = 0; s < 3; s++) {
    const sX = s * 14 - 14;
    // Cylindrical Silo Body (Height 26m, Radius 5.5m)
    const siloBody = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 24, 20), metalSiloMat);
    siloBody.position.set(sX, 12, 0);
    siloBody.castShadow = true;

    // Conical Roof
    const siloCone = new THREE.Mesh(new THREE.ConeGeometry(5.8, 5, 20), metalSiloMat);
    siloCone.position.set(sX, 26.5, 0);
    siloCone.castShadow = true;

    // Service Ladder
    const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.8, 24, 0.4), steelFrameMat);
    ladder.position.set(sX, 12, 5.7);

    siloGroup.add(siloBody, siloCone, ladder);
  }

  // Interconnecting Overhead Conveyor Pipe
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 36, 12), steelFrameMat);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(0, 27, 0);
  siloGroup.add(pipe);

  return siloGroup;
}

function createFarmWindmill(x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const towerGeo = new THREE.CylinderGeometry(1.4, 2.8, 16, 12);
  const tower = new THREE.Mesh(towerGeo, woodMat);
  tower.position.set(0, 8, 0);
  tower.castShadow = true;

  const rotor = new THREE.Group();
  rotor.name = 'windmillBlades';
  rotor.position.set(0, 16, 1.6);

  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  rotor.add(hub);

  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  for (let b = 0; b < 4; b++) {
    const angle = (b * Math.PI) / 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.1), bladeMat);
    blade.position.set(Math.sin(angle) * 4.5, Math.cos(angle) * 4.5, 0);
    blade.rotation.z = -angle;
    rotor.add(blade);
  }

  group.add(tower, rotor);
  return group;
}

function createHeavyFarmTractor(x: number, y: number, z: number, color: number): THREE.Group {
  const tractor = new THREE.Group();
  tractor.position.set(x, y, z);

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, transmission: 0.85 });

  // Engine Hood
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 3.8), bodyMat);
  hood.position.set(0, 1.8, 1.4);
  hood.castShadow = true;

  // Glass Enclosed Operator Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.2, 2.4), glassMat);
  cab.position.set(0, 3.2, -1.2);

  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 2.7), bodyMat);
  cabRoof.position.set(0, 4.35, -1.2);

  // Vertical Exhaust Stack
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 12), darkMat);
  exhaust.position.set(0.9, 3.4, 2.2);

  tractor.add(hood, cab, cabRoof, exhaust);

  // Wheels Group
  const wheels = new THREE.Group();
  wheels.name = 'tractorWheels';

  // Giant Rear Agricultural Knobby Tires (Radius 1.2m, Width 0.8m)
  const rearTireGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.8, 18);
  rearTireGeo.rotateZ(Math.PI / 2);
  const rearLeft = new THREE.Mesh(rearTireGeo, tireMat);
  rearLeft.position.set(-1.6, 1.2, -1.2);
  rearLeft.castShadow = true;

  const rearRight = new THREE.Mesh(rearTireGeo, tireMat);
  rearRight.position.set(1.6, 1.2, -1.2);
  rearRight.castShadow = true;

  // Yellow Hub Rim Inserts
  const rimGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.82, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const rimL = new THREE.Mesh(rimGeo, rimMat);
  rimL.position.set(-1.6, 1.2, -1.2);
  const rimR = new THREE.Mesh(rimGeo, rimMat);
  rimR.position.set(1.6, 1.2, -1.2);

  // Front Steer Tires (Radius 0.75m)
  const frontTireGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.5, 16);
  frontTireGeo.rotateZ(Math.PI / 2);
  const frontLeft = new THREE.Mesh(frontTireGeo, tireMat);
  frontLeft.position.set(-1.4, 0.75, 2.2);
  frontLeft.castShadow = true;

  const frontRight = new THREE.Mesh(frontTireGeo, tireMat);
  frontRight.position.set(1.4, 0.75, 2.2);
  frontRight.castShadow = true;

  wheels.add(rearLeft, rearRight, rimL, rimR, frontLeft, frontRight);
  tractor.add(wheels);

  // 3-Point Hitch with Trailed Furrow Disc Plow
  const plowGroup = new THREE.Group();
  plowGroup.name = 'furrowPlow';
  plowGroup.position.set(0, 0.8, -3.2);

  const hitch = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 2.2), darkMat);
  hitch.position.set(0, 0, 0);

  const plowFrame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 0.6), bodyMat);
  plowFrame.position.set(0, 0, -1.2);

  const discMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
  const discGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.1, 14);
  discGeo.rotateZ(Math.PI / 2);

  for (let d = -1.8; d <= 1.8; d += 0.7) {
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(d, -0.4, -1.2);
    disc.rotation.y = 0.35;
    plowGroup.add(disc);
  }

  plowGroup.add(hitch, plowFrame);
  tractor.add(plowGroup);

  return tractor;
}

function createCombineHarvester(x: number, y: number, z: number): THREE.Group {
  const combine = new THREE.Group();
  combine.position.set(x, y, z);

  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.85, roughness: 0.3 });

  // Main Machine Chassis (Length 9m, Width 4.2m, Height 4.8m)
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.8, 8.5), redMat);
  body.position.set(0, 3.2, 0);
  body.castShadow = true;

  // Elevated Glass Cockpit
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 2.0, 2.2),
    new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.1, transmission: 0.85 })
  );
  cab.position.set(0, 4.8, 3.2);

  // Grain Unloading Auger Pipe
  const auger = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7.5, 12), redMat);
  auger.position.set(-2.8, 5.0, -1.2);
  auger.rotation.z = -0.55;

  // Front Harvesting Header & Revolving Reel (Width 10m)
  const header = new THREE.Mesh(new THREE.BoxGeometry(9.8, 1.2, 2.0), redMat);
  header.position.set(0, 1.2, 5.5);
  header.castShadow = true;

  const reelGroup = new THREE.Group();
  reelGroup.name = 'harvestReel';
  reelGroup.position.set(0, 1.8, 6.2);

  const reelShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 9.6, 12), steelMat);
  reelShaft.rotation.z = Math.PI / 2;
  reelGroup.add(reelShaft);

  for (let b = 0; b < 6; b++) {
    const angle = (b * Math.PI) / 3;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.1, 0.2), steelMat);
    bar.position.set(0, Math.sin(angle) * 0.9, Math.cos(angle) * 0.9);
    reelGroup.add(bar);
  }

  // Heavy Harvester Tires
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.95 });
  const frontTireGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.9, 18);
  frontTireGeo.rotateZ(Math.PI / 2);

  const tFL = new THREE.Mesh(frontTireGeo, tireMat);
  tFL.position.set(-2.2, 1.4, 2.0);
  const tFR = new THREE.Mesh(frontTireGeo, tireMat);
  tFR.position.set(2.2, 1.4, 2.0);

  const rearTireGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.6, 16);
  rearTireGeo.rotateZ(Math.PI / 2);
  const tRL = new THREE.Mesh(rearTireGeo, tireMat);
  tRL.position.set(-1.8, 0.9, -2.8);
  const tRR = new THREE.Mesh(rearTireGeo, tireMat);
  tRR.position.set(1.8, 0.9, -2.8);

  combine.add(body, cab, auger, header, reelGroup, tFL, tFR, tRL, tRR);
  return combine;
}

function createFarmerModel(x: number, y: number, z: number, rotation: number): THREE.Group {
  const farmer = new THREE.Group();
  farmer.position.set(x, y, z);
  farmer.rotation.y = rotation;

  const denimMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.8 }); // Blue Overalls
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 }); // Plaid shirt
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.9 }); // Straw Hat
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe2a77a, roughness: 0.6 });

  // Body
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), shirtMat);
  torso.position.set(0, 1.15, 0);
  torso.castShadow = true;

  const overalls = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.32), denimMat);
  overalls.position.set(0, 1.0, 0);

  // Head & Straw Hat
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat);
  head.position.set(0, 1.62, 0);

  const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.16, 12), hatMat);
  hatCrown.position.set(0, 0.14, 0);
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 14), hatMat);
  hatBrim.position.set(0, 0.08, 0);
  head.add(hatCrown, hatBrim);

  // Legs & Boots
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), denimMat);
  legL.position.set(-0.14, 0.4, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), denimMat);
  legR.position.set(0.14, 0.4, 0);

  farmer.add(torso, overalls, head, legL, legR);
  return farmer;
}

function createVillageCottage(x: number, y: number, z: number, rotation: number, style: 'timber' | 'stone' | 'brick'): THREE.Group {
  const cottage = new THREE.Group();
  cottage.position.set(x, y, z);
  cottage.rotation.y = rotation;

  let wallColor = 0xf8fafc;
  if (style === 'stone') wallColor = 0xa8a29e;
  if (style === 'brick') wallColor = 0xb45309;

  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }); // Terracotta tile roof
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });

  // Main House Box
  const houseW = 12;
  const houseL = 16;
  const houseH = 6.5;
  const house = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseL), wallMat);
  house.position.set(0, houseH / 2, 0);
  house.castShadow = true;
  house.receiveShadow = true;

  // Pitched Roof
  const roofGeo = new THREE.ConeGeometry(11, 4.5, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, houseH + 2.25, 0);
  roof.scale.set(1.2, 1, 1.5);
  roof.castShadow = true;

  // Brick Chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5, 1.2), new THREE.MeshStandardMaterial({ color: 0x991b1b }));
  chimney.position.set(houseW / 3, houseH + 2.5, houseL / 4);
  chimney.castShadow = true;

  // Wooden Front Porch & Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.2, 0.2), doorMat);
  door.position.set(0, 1.6, houseL / 2 + 0.1);

  // Front Picket Fence
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
  const fence = new THREE.Mesh(new THREE.BoxGeometry(houseW + 8, 1.2, 0.2), fenceMat);
  fence.position.set(0, 0.6, houseL / 2 + 6);

  cottage.add(house, roof, chimney, door, fence);
  return cottage;
}

function createVillageWindmill(x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.9 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 6.5, 22, 16), stoneMat);
  tower.position.set(0, 11, 0);
  tower.castShadow = true;

  const cap = new THREE.Mesh(new THREE.ConeGeometry(5.2, 4, 16), capMat);
  cap.position.set(0, 24, 0);

  const sailsGroup = new THREE.Group();
  sailsGroup.name = 'windmillSails';
  sailsGroup.position.set(0, 21, 5.0);

  const sailMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8 });
  for (let s = 0; s < 4; s++) {
    const angle = (s * Math.PI) / 2;
    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 14, 0.2), capMat);
    spar.position.set(Math.sin(angle) * 7, Math.cos(angle) * 7, 0);
    spar.rotation.z = -angle;

    const cloth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 10, 0.05), sailMat);
    cloth.position.set(Math.sin(angle) * 7 + 1.1, Math.cos(angle) * 7, 0.1);
    cloth.rotation.z = -angle;

    sailsGroup.add(spar, cloth);
  }

  group.add(tower, cap, sailsGroup);
  return group;
}

function createVillageStore(x: number, y: number, z: number): THREE.Group {
  const store = new THREE.Group();
  store.position.set(x, y, z);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 14), woodMat);
  body.position.set(0, 3.5, 0);
  body.castShadow = true;

  // Antique Red Gas Pump outside
  const pump = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 1.2), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
  pump.position.set(6, 1.3, 9.5);
  pump.castShadow = true;

  store.add(body, pump);
  return store;
}

function createCivicFountain(x: number, y: number, z: number): THREE.Group {
  const fountain = new THREE.Group();
  fountain.position.set(x, y, z);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.1, transmission: 0.85 });

  // Tier 1 Pool Basin (Radius 12m)
  const basin1 = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 1.4, 24), stoneMat);
  basin1.position.set(0, 0.7, 0);
  basin1.castShadow = true;

  const water1 = new THREE.Mesh(new THREE.CylinderGeometry(11.2, 11.2, 1.2, 24), waterMat);
  water1.name = 'fountainWater';
  water1.position.set(0, 0.8, 0);

  // Tier 2 Center Pedestal & Basin
  const ped1 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 3.5, 16), stoneMat);
  ped1.position.set(0, 2.5, 0);
  const basin2 = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 2.5, 1.2, 20), stoneMat);
  basin2.position.set(0, 4.5, 0);

  // Tier 3 Spire
  const ped2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 2.5, 16), stoneMat);
  ped2.position.set(0, 6.0, 0);
  const basin3 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 1.2, 0.8, 16), stoneMat);
  basin3.position.set(0, 7.4, 0);

  fountain.add(basin1, water1, ped1, basin2, ped2, basin3);
  return fountain;
}

function createStorefront(x: number, y: number, z: number, index: number): THREE.Group {
  const shop = new THREE.Group();
  shop.position.set(x, y, z);

  const facadeTex = getBuildingFacadeTexture('commercial');
  const shopMat = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(22, 12, 22), shopMat);
  body.position.set(0, 6, 0);
  body.castShadow = true;

  // Colorful Awning (Striped)
  const awningColors = [0xef4444, 0x3b82f6, 0x10b981, 0x8b5cf6];
  const awningColor = awningColors[index % awningColors.length];
  const awningMat = new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.6 });

  const awning = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 4), awningMat);
  awning.position.set(0, 4.5, 12);
  awning.rotation.x = 0.35;
  awning.castShadow = true;

  shop.add(body, awning);
  return shop;
}
