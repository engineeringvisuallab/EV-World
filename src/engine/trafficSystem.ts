import * as THREE from 'three';
import { getTerrainHeight } from './terrainEngine';

export interface TrafficVehicleData {
  id: string;
  type: 'mixer' | 'dump' | 'hauler' | 'pickup' | 'sedan' | 'van';
  mesh: THREE.Group;
  wheels: THREE.Mesh[];
  animPart?: THREE.Object3D;
  route: 'bridge_east' | 'bridge_west' | 'avenue_north' | 'avenue_south' | 'boulevard_east' | 'boulevard_west' | 'highway_north' | 'highway_south';
  progress: number;
  speed: number;
  length: number;
  x: number;
  z: number;
  rotation: number;
  color: number;
}

export class TrafficSystem {
  public vehicles: TrafficVehicleData[] = [];
  public group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = 'TrafficSystemGroup';
    scene.add(this.group);

    this.spawnDefaultTraffic();
  }

  private spawnDefaultTraffic() {
    // 1. Bridge Eastbound Traffic (X from -380 to +340, Z = -3.5)
    this.createVehicle('sedan', 'bridge_east', 0.1, 32, 0x2980b9);
    this.createVehicle('mixer', 'bridge_east', 0.35, 20, 0xe67e22);
    this.createVehicle('pickup', 'bridge_east', 0.65, 26, 0xf1c40f);
    this.createVehicle('hauler', 'bridge_east', 0.88, 18, 0x7f8c8d);

    // 2. Bridge Westbound Traffic (X from +340 to -380, Z = +3.5)
    this.createVehicle('dump', 'bridge_west', 0.15, 22, 0xd35400);
    this.createVehicle('sedan', 'bridge_west', 0.45, 34, 0xecf0f1);
    this.createVehicle('van', 'bridge_west', 0.75, 24, 0x34495e);

    // 3. North-South Avenue Corridor (Z: -2200 to +2200)
    this.createVehicle('pickup', 'avenue_north', 0.15, 28, 0x27ae60);
    this.createVehicle('sedan', 'avenue_north', 0.45, 35, 0xc0392b);
    this.createVehicle('mixer', 'avenue_north', 0.75, 22, 0x9b59b6);

    this.createVehicle('hauler', 'avenue_south', 0.05, 24, 0x34495e);
    this.createVehicle('dump', 'avenue_south', 0.35, 25, 0xf39c12);
    this.createVehicle('sedan', 'avenue_south', 0.68, 36, 0x1abc9c);
    this.createVehicle('van', 'avenue_south', 0.9, 30, 0x3498db);

    // 4. East-West Ground Boulevard (X: -2200 to +2200)
    this.createVehicle('van', 'boulevard_east', 0.12, 28, 0x3498db);
    this.createVehicle('sedan', 'boulevard_east', 0.4, 32, 0xe74c3c);
    this.createVehicle('dump', 'boulevard_east', 0.72, 24, 0xf1c40f);

    this.createVehicle('pickup', 'boulevard_west', 0.2, 30, 0xbdc3c7);
    this.createVehicle('mixer', 'boulevard_west', 0.52, 22, 0xe67e22);
    this.createVehicle('sedan', 'boulevard_west', 0.85, 35, 0x2c3e50);
  }

  private createVehicle(
    type: 'mixer' | 'dump' | 'hauler' | 'pickup' | 'sedan' | 'van',
    route: TrafficVehicleData['route'],
    startProgress: number,
    speed: number,
    color: number
  ) {
    const vGroup = new THREE.Group();
    const wheels: THREE.Mesh[] = [];
    let animPart: THREE.Object3D | undefined;

    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.6,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x112233,
      roughness: 0.1,
      metalness: 0.9,
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1b1b1b,
      roughness: 0.8,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x7f8c8d,
      roughness: 0.4,
      metalness: 0.8,
    });

    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.32, 14);
    wheelGeo.rotateZ(Math.PI / 2);

    const addWheels = (xPositions: number[], zPositions: number[], yPos = 0.4) => {
      xPositions.forEach((wx) => {
        zPositions.forEach((wz) => {
          const wheel = new THREE.Mesh(wheelGeo, wheelMat);
          wheel.position.set(wx, yPos, wz);
          wheel.castShadow = true;
          vGroup.add(wheel);
          wheels.push(wheel);
        });
      });
    };

    if (type === 'mixer') {
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.5, 2.2), steelMat);
      chassis.position.set(0, 0.6, 0);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 2.1), bodyMat);
      cab.position.set(2.2, 1.6, 0);
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.9), glassMat);
      windshield.position.set(2.4, 1.8, 0);

      const drumGeo = new THREE.CylinderGeometry(1.1, 0.7, 3.8, 16);
      drumGeo.rotateZ(Math.PI / 2);
      const drumMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.4, metalness: 0.5 });
      const drum = new THREE.Mesh(drumGeo, drumMat);
      drum.position.set(-0.8, 1.8, 0);
      drum.rotation.z = -0.2;
      drum.castShadow = true;
      vGroup.add(chassis, cab, windshield, drum);
      animPart = drum;

      addWheels([2.0, -1.2, -2.2], [-1.0, 1.0], 0.45);
    } else if (type === 'dump') {
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.5, 2.3), steelMat);
      chassis.position.set(0, 0.6, 0);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.7, 2.2), bodyMat);
      cab.position.set(2.0, 1.7, 0);
      const bedMat = new THREE.MeshStandardMaterial({ color: 0x566573, roughness: 0.7 });
      const bed = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.4, 2.2), bedMat);
      bed.position.set(-1.0, 1.7, 0);

      vGroup.add(chassis, cab, bed);
      addWheels([1.8, -1.0, -2.0], [-1.05, 1.05], 0.48);
    } else if (type === 'hauler') {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.2), bodyMat);
      cab.position.set(3.2, 1.6, 0);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.4, 2.2), steelMat);
      bed.position.set(-1.0, 0.8, 0);

      vGroup.add(cab, bed);
      addWheels([3.0, 1.2, -2.2, -3.2], [-1.05, 1.05], 0.5);
    } else if (type === 'pickup') {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.9), bodyMat);
      cab.position.set(0.6, 0.9, 0);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 1.9), steelMat);
      bed.position.set(-1.4, 0.75, 0);

      vGroup.add(cab, bed);
      addWheels([1.4, -1.4], [-0.95, 0.95], 0.4);
    } else if (type === 'van') {
      const vanBody = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.8, 2.0), bodyMat);
      vanBody.position.set(0, 1.3, 0);
      vGroup.add(vanBody);
      addWheels([1.4, -1.4], [-0.95, 0.95], 0.4);
    } else {
      // Standard Sedan
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, 1.8), bodyMat);
      body.position.set(0, 0.55, 0);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.6), glassMat);
      cabin.position.set(-0.2, 1.1, 0);

      vGroup.add(body, cabin);
      addWheels([1.3, -1.3], [-0.9, 0.9], 0.38);
    }

    this.group.add(vGroup);

    const vehicleData: TrafficVehicleData = {
      id: `traffic_${Date.now()}_${Math.random()}`,
      type,
      mesh: vGroup,
      wheels,
      animPart,
      route,
      progress: startProgress,
      speed,
      length: 5.0,
      x: 0,
      z: 0,
      rotation: 0,
      color,
    };

    this.vehicles.push(vehicleData);
  }

  public update(delta: number) {
    this.vehicles.forEach((v) => {
      const distanceTravelled = (v.speed / 3.6) * delta;
      let x = 0;
      let z = 0;
      let rotY = 0;

      if (v.route === 'bridge_east') {
        const trackLength = 720;
        v.progress = (v.progress + distanceTravelled / trackLength) % 1.0;
        x = -380 + v.progress * trackLength;
        z = -3.5;
        rotY = 0;
      } else if (v.route === 'bridge_west') {
        const trackLength = 720;
        v.progress = (v.progress + distanceTravelled / trackLength) % 1.0;
        x = 340 - v.progress * trackLength;
        z = 3.5;
        rotY = Math.PI;
      } else if (v.route === 'avenue_north') {
        const trackLength = 4400;
        v.progress = (v.progress + distanceTravelled / trackLength) % 1.0;
        x = 96;
        z = -2200 + v.progress * trackLength;
        rotY = Math.PI / 2;
      } else if (v.route === 'avenue_south') {
        const trackLength = 4400;
        v.progress = (v.progress + distanceTravelled / trackLength) % 1.0;
        x = 104;
        z = 2200 - v.progress * trackLength;
        rotY = -Math.PI / 2;
      } else if (v.route === 'boulevard_east') {
        const trackLength = 4400;
        v.progress = (v.progress + distanceTravelled / trackLength) % 1.0;
        x = -2200 + v.progress * trackLength;
        z = 67;
        rotY = 0;
      } else if (v.route === 'boulevard_west') {
        const trackLength = 4400;
        v.progress = (v.progress + distanceTravelled / trackLength) % 1.0;
        x = 2200 - v.progress * trackLength;
        z = 73;
        rotY = Math.PI;
      }

      // Height adhering solidly to terrain engine
      const y = getTerrainHeight(x, z);

      v.x = x;
      v.z = z;
      v.rotation = rotY;

      v.mesh.position.set(x, y, z);
      v.mesh.rotation.y = rotY;

      const wheelSpin = distanceTravelled / 0.4;
      v.wheels.forEach((w) => {
        w.rotation.x += wheelSpin;
      });

      if (v.animPart) {
        v.animPart.rotation.x += delta * 3.5;
      }
    });
  }

  public getLiveTrafficPositions(): { x: number; z: number; type: string; color: string }[] {
    return this.vehicles.map((v) => ({
      x: v.x,
      z: v.z,
      type: v.type,
      color: '#' + v.color.toString(16).padStart(6, '0'),
    }));
  }
}
