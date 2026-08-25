import * as THREE from 'three';
import { VehicleModelType, VehicleDefinition, VehicleState } from '../types';
import { getTerrainHeight } from './terrainEngine';

export const VEHICLE_CATALOG: Record<VehicleModelType, VehicleDefinition> = {
  suv: {
    id: 'suv',
    name: 'UELE Cyber-SUV',
    category: 'Inspection & Survey Patrol',
    maxSpeed: 110,
    accelRate: 45,
    brakeRate: 75,
    turnSpeed: 2.8,
    cockpitHeight: 1.45,
    cockpitForward: 0.35,
    color: '#0f172a',
  },
  sport: {
    id: 'sport',
    name: 'Apollo GT Electric',
    category: 'High-Speed Rapid Response',
    maxSpeed: 165,
    accelRate: 70,
    brakeRate: 95,
    turnSpeed: 3.4,
    cockpitHeight: 1.05,
    cockpitForward: 0.2,
    color: '#dc2626',
  },
  truck: {
    id: 'truck',
    name: 'Heavy Duty 4x4 Pickup',
    category: 'Field Engineering Utility',
    maxSpeed: 95,
    accelRate: 38,
    brakeRate: 65,
    turnSpeed: 2.4,
    cockpitHeight: 1.75,
    cockpitForward: 0.5,
    color: '#0284c7',
  },
  mixer: {
    id: 'mixer',
    name: 'Rotary Concrete Mixer',
    category: 'Structural Pouring Heavy',
    maxSpeed: 75,
    accelRate: 28,
    brakeRate: 55,
    turnSpeed: 1.9,
    cockpitHeight: 2.1,
    cockpitForward: 1.2,
    color: '#d97706',
  },
  heavy_hauler: {
    id: 'heavy_hauler',
    name: 'Titan Earth Mover 8x8',
    category: 'Earthworks & Quarry Hauler',
    maxSpeed: 60,
    accelRate: 22,
    brakeRate: 50,
    turnSpeed: 1.6,
    cockpitHeight: 2.4,
    cockpitForward: 1.4,
    color: '#ca8a04',
  },
};

export class VehicleController {
  public mesh: THREE.Group;
  public state: VehicleState = {
    x: 0,
    y: 12,
    z: 0,
    rotation: 0,
    speed: 0,
    steerAngle: 0,
    gear: 'D',
    rpm: 800,
    headlights: true,
    vehicleType: 'suv',
  };

  public currentVehicleDef: VehicleDefinition = VEHICLE_CATALOG.suv;

  private keys: { [key: string]: boolean } = {};
  private wheels: THREE.Mesh[] = [];
  private frontWheels: THREE.Group[] = [];
  private headlightGlows: THREE.SpotLight[] = [];
  private animatables: Array<{ update: (time: number, delta: number) => void }> = [];
  private smoothedPitch = 0;
  private smoothedRoll = 0;

  constructor(initialType: VehicleModelType = 'suv') {
    this.mesh = new THREE.Group();
    this.mesh.name = 'player_vehicle';
    this.setVehicleType(initialType);
    this.bindEvents();
  }

  public setVehicleType(type: VehicleModelType) {
    this.state.vehicleType = type;
    this.currentVehicleDef = VEHICLE_CATALOG[type] || VEHICLE_CATALOG.suv;

    // Clear old mesh children and lights
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }
    this.wheels = [];
    this.frontWheels = [];
    this.headlightGlows = [];
    this.animatables = [];

    // Build specific vehicle geometry
    this.buildCurrentVehicleMesh();

    // Re-apply headlights state
    this.setHeadlights(this.state.headlights);
  }

  public toggleHeadlights() {
    this.setHeadlights(!this.state.headlights);
  }

  public setHeadlights(on: boolean) {
    this.state.headlights = on;
    this.headlightGlows.forEach((light) => {
      light.visible = on;
    });
  }

  private buildCurrentVehicleMesh() {
    switch (this.state.vehicleType) {
      case 'sport':
        this.buildSportCar();
        break;
      case 'truck':
        this.buildPickupTruck();
        break;
      case 'mixer':
        this.buildConcreteMixer();
        break;
      case 'heavy_hauler':
        this.buildHeavyHauler();
        break;
      case 'suv':
      default:
        this.buildSuv();
        break;
    }
  }

  // 1. CYBER SUV
  private buildSuv() {
    const car = this.mesh;
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x111827,
      metalness: 0.85,
      roughness: 0.2,
      clearcoat: 0.9,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.3,
      roughness: 0.1,
      transmission: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
    body.position.set(0, 0.75, 0);
    body.castShadow = true;
    car.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.3), glassMat);
    cabin.position.set(0, 1.38, -0.2);
    cabin.castShadow = true;
    car.add(cabin);

    // Flashing Beacon
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.2, 12),
      new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.9 })
    );
    beacon.position.set(0, 1.78, -0.2);
    car.add(beacon);

    this.addStandardHeadlights(car, 0.75, 0.75, 2.2, 0.8);
    this.addStandardTaillights(car, 1.8, 0.85, -2.2);
    this.addStandardWheels(car, 0.42, 0.32, 1.05, 1.4, -1.3, rimMat);
  }

  // 2. SPORT GT RAPID RESPONSE
  private buildSportCar() {
    const car = this.mesh;
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1.0,
    });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x18181b,
      roughness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.9,
    });
    const goldRim = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.15 });

    // Sleek low chassis
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 4.6), paintMat);
    body.position.set(0, 0.48, 0);
    body.castShadow = true;
    car.add(body);

    // Aerodynamic cockpit
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 2.2), glassMat);
    cabin.position.set(0, 0.9, -0.2);
    cabin.castShadow = true;
    car.add(cabin);

    // Rear Carbon Spoiler
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.35), blackMat);
    spoiler.position.set(0, 1.05, -2.1);
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.15), blackMat);
    postL.position.set(-0.6, 0.88, -2.1);
    const postR = postL.clone();
    postR.position.x = 0.6;
    car.add(spoiler, postL, postR);

    // Neon Headlights
    this.addStandardHeadlights(car, 0.7, 0.5, 2.3, 0.5);
    this.addStandardTaillights(car, 1.7, 0.6, -2.3);
    this.addStandardWheels(car, 0.38, 0.34, 1.0, 1.5, -1.4, goldRim);
  }

  // 3. FIELD PICKUP TRUCK
  private buildPickupTruck() {
    const car = this.mesh;
    const paintMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });

    // Front Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 2.4), paintMat);
    cab.position.set(0, 1.1, 0.6);
    cab.castShadow = true;
    car.add(cab);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 1.4), paintMat);
    roof.position.set(0, 1.7, 0.4);
    car.add(roof);

    // Cargo Bed
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.6, 2.3), bedMat);
    bed.position.set(0, 0.9, -1.5);
    bed.castShadow = true;
    car.add(bed);

    // Heavy Bullbar Bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.4, 0.3), chromeMat);
    bumper.position.set(0, 0.65, 2.1);
    car.add(bumper);

    this.addStandardHeadlights(car, 0.8, 1.0, 2.0, 0.9);
    this.addStandardTaillights(car, 1.9, 0.9, -2.65);
    this.addStandardWheels(car, 0.52, 0.38, 1.15, 1.4, -1.6, chromeMat);
  }

  // 4. ROTARY CONCRETE MIXER
  private buildConcreteMixer() {
    const car = this.mesh;
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
    const drumMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.2 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });

    // Heavy 6-wheel chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 6.4), metalMat);
    chassis.position.set(0, 0.8, 0);
    chassis.castShadow = true;
    car.add(chassis);

    // Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.4, 1.8), orangeMat);
    cab.position.set(0, 1.7, 2.1);
    cab.castShadow = true;
    car.add(cab);

    // Rotating Drum
    const drumGeo = new THREE.CylinderGeometry(0.85, 1.25, 3.2, 16);
    drumGeo.rotateX(Math.PI / 2 + 0.2);
    const drum = new THREE.Mesh(drumGeo, drumMat);
    drum.position.set(0, 1.9, -0.9);
    drum.castShadow = true;
    car.add(drum);

    // Animate drum rotation
    this.animatables.push({
      update: (time, delta) => {
        drum.rotation.z += delta * 2.5;
      },
    });

    this.addStandardHeadlights(car, 0.85, 1.2, 3.0, 1.1);
    this.addStandardTaillights(car, 2.0, 0.9, -3.2);

    // 6 Wheels
    this.addWheelSet(car, [
      { x: -1.2, z: 2.1, isFront: true, radius: 0.55 },
      { x: 1.2, z: 2.1, isFront: true, radius: 0.55 },
      { x: -1.2, z: -0.8, isFront: false, radius: 0.55 },
      { x: 1.2, z: -0.8, isFront: false, radius: 0.55 },
      { x: -1.2, z: -2.1, isFront: false, radius: 0.55 },
      { x: 1.2, z: -2.1, isFront: false, radius: 0.55 },
    ]);
  }

  // 5. TITAN HEAVY HAULER 8x8
  private buildHeavyHauler() {
    const car = this.mesh;
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.5, metalness: 0.2 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });

    // Giant Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 7.2), steelMat);
    chassis.position.set(0, 1.0, 0);
    chassis.castShadow = true;
    car.add(chassis);

    // Offset Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.6), yellowMat);
    cab.position.set(-0.7, 2.0, 2.3);
    cab.castShadow = true;
    car.add(cab);

    // Massive Dump Bed
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.4, 4.4), yellowMat);
    bed.position.set(0, 2.0, -1.1);
    bed.castShadow = true;
    car.add(bed);

    this.addStandardHeadlights(car, 1.0, 1.3, 3.4, 1.2);
    this.addStandardTaillights(car, 2.4, 1.1, -3.6);

    // 8 Massive wheels
    this.addWheelSet(car, [
      { x: -1.45, z: 2.4, isFront: true, radius: 0.65 },
      { x: 1.45, z: 2.4, isFront: true, radius: 0.65 },
      { x: -1.45, z: 1.0, isFront: true, radius: 0.65 },
      { x: 1.45, z: 1.0, isFront: true, radius: 0.65 },
      { x: -1.45, z: -1.1, isFront: false, radius: 0.65 },
      { x: 1.45, z: -1.1, isFront: false, radius: 0.65 },
      { x: -1.45, z: -2.5, isFront: false, radius: 0.65 },
      { x: 1.45, z: -2.5, isFront: false, radius: 0.65 },
    ]);
  }

  // Headlights & Spotlights Helper
  private addStandardHeadlights(
    car: THREE.Group,
    spreadX: number,
    heightY: number,
    forwardZ: number,
    _intensity = 1.0
  ) {
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), hlMat);
    hlLeft.position.set(-spreadX, heightY, forwardZ);
    const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), hlMat);
    hlRight.position.set(spreadX, heightY, forwardZ);
    car.add(hlLeft, hlRight);

    // Spotlights
    const spotL = new THREE.SpotLight(0xfff8ee, 30, 50, Math.PI / 6, 0.35);
    spotL.position.set(-spreadX, heightY, forwardZ);
    spotL.target.position.set(-spreadX, 0, forwardZ + 18);
    car.add(spotL, spotL.target);
    this.headlightGlows.push(spotL);

    const spotR = new THREE.SpotLight(0xfff8ee, 30, 50, Math.PI / 6, 0.35);
    spotR.position.set(spreadX, heightY, forwardZ);
    spotR.target.position.set(spreadX, 0, forwardZ + 18);
    car.add(spotR, spotR.target);
    this.headlightGlows.push(spotR);
  }

  // Taillights Helper
  private addStandardTaillights(car: THREE.Group, width: number, heightY: number, rearZ: number) {
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });
    const tl = new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, 0.06), tlMat);
    tl.position.set(0, heightY, rearZ);
    car.add(tl);
  }

  // Wheels Helper for 4 Wheels
  private addStandardWheels(
    car: THREE.Group,
    radius: number,
    width: number,
    spreadX: number,
    frontZ: number,
    rearZ: number,
    rimMat: THREE.Material
  ) {
    const offsets = [
      { x: -spreadX, z: frontZ, isFront: true, radius, width, rimMat },
      { x: spreadX, z: frontZ, isFront: true, radius, width, rimMat },
      { x: -spreadX, z: rearZ, isFront: false, radius, width, rimMat },
      { x: spreadX, z: rearZ, isFront: false, radius, width, rimMat },
    ];
    this.addWheelSet(car, offsets);
  }

  private addWheelSet(
    car: THREE.Group,
    offsets: Array<{
      x: number;
      z: number;
      isFront: boolean;
      radius: number;
      width?: number;
      rimMat?: THREE.Material;
    }>
  ) {
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.85 });
    const defaultRim = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });

    offsets.forEach((wo) => {
      const wWidth = wo.width || 0.36;
      const wheelGeo = new THREE.CylinderGeometry(wo.radius, wo.radius, wWidth, 18);
      wheelGeo.rotateZ(Math.PI / 2);

      const mount = new THREE.Group();
      mount.position.set(wo.x, wo.radius, wo.z);

      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.castShadow = true;
      mount.add(tire);

      const rimGeo = new THREE.CylinderGeometry(wo.radius * 0.58, wo.radius * 0.58, wWidth + 0.01, 12);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, wo.rimMat || defaultRim);
      mount.add(rim);

      car.add(mount);
      this.wheels.push(tire);

      if (wo.isFront) {
        this.frontWheels.push(mount);
      }
    });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key] = true;
    this.keys[e.code] = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key] = false;
    this.keys[e.code] = false;
  };

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /** Removes keyboard listeners bound in bindEvents(). Call when this controller is discarded. */
  public dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  public setPosition(x: number, y: number, z: number, rotation = 0) {
    this.state.x = x;
    this.state.y = y;
    this.state.z = z;
    this.state.rotation = rotation;
    this.state.speed = 0;
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.y = rotation;
  }

  public update(delta: number, time = 0) {
    const def = this.currentVehicleDef;
    const maxSpeed = def.maxSpeed;
    const maxReverse = -Math.round(def.maxSpeed * 0.35);
    const accelRate = def.accelRate;
    const brakeRate = def.brakeRate;
    const drag = 14;

    const forward = this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['w'] || this.keys['W'];
    const backward = this.keys['ArrowDown'] || this.keys['KeyS'] || this.keys['s'] || this.keys['S'];
    const left = this.keys['ArrowLeft'] || this.keys['KeyA'] || this.keys['a'] || this.keys['A'];
    const right = this.keys['ArrowRight'] || this.keys['KeyD'] || this.keys['d'] || this.keys['D'];

    // Acceleration & Braking
    if (forward) {
      if (this.state.speed < 0) {
        this.state.speed += brakeRate * delta;
      } else {
        this.state.speed = Math.min(maxSpeed, this.state.speed + accelRate * delta);
      }
      this.state.gear = 'D';
    } else if (backward) {
      if (this.state.speed > 0) {
        this.state.speed -= brakeRate * delta;
      } else {
        this.state.speed = Math.max(maxReverse, this.state.speed - accelRate * 0.8 * delta);
        this.state.gear = 'R';
      }
    } else {
      if (this.state.speed > 0) {
        this.state.speed = Math.max(0, this.state.speed - drag * delta);
      } else if (this.state.speed < 0) {
        this.state.speed = Math.min(0, this.state.speed + drag * delta);
      }
      if (Math.abs(this.state.speed) < 0.5) this.state.gear = 'P';
    }

    // Steering
    const maxSteer = 0.52;
    const steerSpeed = def.turnSpeed;
    if (left) {
      this.state.steerAngle = Math.min(maxSteer, this.state.steerAngle + steerSpeed * delta);
    } else if (right) {
      this.state.steerAngle = Math.max(-maxSteer, this.state.steerAngle - steerSpeed * delta);
    } else {
      this.state.steerAngle *= Math.exp(-6 * delta);
    }

    this.frontWheels.forEach((w) => {
      w.rotation.y = this.state.steerAngle;
    });

    if (Math.abs(this.state.speed) > 0.5) {
      const turnFactor = (this.state.speed / 50) * this.state.steerAngle * delta * 1.75;
      this.state.rotation += turnFactor;
    }

    const speedMs = (this.state.speed / 3.6) * delta;
    this.state.x += Math.sin(this.state.rotation) * speedMs;
    this.state.z += Math.cos(this.state.rotation) * speedMs;

    const wheelRotDelta = speedMs / 0.45;
    this.wheels.forEach((w) => {
      w.rotation.x += wheelRotDelta;
    });

    // Solid Ground Terrain & Bridge Surface Calculation
    const groundY = getTerrainHeight(this.state.x, this.state.z);
    this.state.y = THREE.MathUtils.damp(this.state.y, groundY, 18, delta);

    // Dynamic pitch and roll according to terrain slope
    const fwdDist = 2.0;
    const fx = this.state.x + Math.sin(this.state.rotation) * fwdDist;
    const fz = this.state.z + Math.cos(this.state.rotation) * fwdDist;
    const bx = this.state.x - Math.sin(this.state.rotation) * fwdDist;
    const bz = this.state.z - Math.cos(this.state.rotation) * fwdDist;
    const fy = getTerrainHeight(fx, fz);
    const by = getTerrainHeight(bx, bz);
    const pitch = Math.atan2(fy - by, fwdDist * 2);

    const sideDist = 1.0;
    const lx = this.state.x - Math.cos(this.state.rotation) * sideDist;
    const lz = this.state.z + Math.sin(this.state.rotation) * sideDist;
    const rx = this.state.x + Math.cos(this.state.rotation) * sideDist;
    const rz = this.state.z - Math.sin(this.state.rotation) * sideDist;
    const ly = getTerrainHeight(lx, lz);
    const ry = getTerrainHeight(rx, rz);
    const roll = Math.atan2(ly - ry, sideDist * 2);

    this.smoothedPitch = THREE.MathUtils.damp(this.smoothedPitch, pitch, 10, delta);
    this.smoothedRoll = THREE.MathUtils.damp(this.smoothedRoll, roll, 10, delta);

    this.state.rpm = Math.floor(800 + (Math.abs(this.state.speed) / maxSpeed) * 4500 + (forward ? 600 : 0));

    this.mesh.position.set(this.state.x, this.state.y, this.state.z);
    this.mesh.rotation.set(this.smoothedPitch, this.state.rotation, -this.smoothedRoll, 'YXZ');

    // Update inner animatables (e.g. mixer drum)
    this.animatables.forEach((a) => a.update(time, delta));
  }
}
