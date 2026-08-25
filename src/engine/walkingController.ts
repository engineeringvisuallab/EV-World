import * as THREE from 'three';
import { getTerrainHeight } from './terrainEngine';

export class WalkingController {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public rotation: number = 0; // Yaw in radians
  public isWalking: boolean = false;
  public isSprinting: boolean = false;
  public isJumping: boolean = false;
  public verticalVelocity: number = 0;
  public currentSpeed: number = 0; // in km/h for telemetry
  public distanceWalked: number = 0;
  public stepsCount: number = 0;
  public stamina: number = 100;
  public flashlightOn: boolean = true;
  public viewMode: 'first_person' | 'third_person' = 'third_person';

  // Body parts for procedural animation
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private torso: THREE.Mesh;
  private head: THREE.Mesh;
  private helmet: THREE.Mesh;
  private flashlightLight: THREE.SpotLight;
  private walkPhase: number = 0;

  // Key states
  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
  };

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor(startX = 0, startZ = 0, startRot = 0) {
    this.position = new THREE.Vector3(startX, getTerrainHeight(startX, startZ), startZ);
    this.velocity = new THREE.Vector3();
    this.rotation = startRot;

    // Build 3D Engineer Character Mesh
    this.mesh = new THREE.Group();
    this.mesh.name = 'WalkingCharacter';

    // Materials
    const vestMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, // High-Vis Safety Orange
      roughness: 0.5,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Reflective Silver
      roughness: 0.2,
      metalness: 0.8,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Navy Work Trousers
      roughness: 0.7,
    });
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x292524, // Steel Toe Boots
      roughness: 0.9,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xe2a77a, // Skin Tone
      roughness: 0.6,
    });
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // Safety Yellow Hard Hat
      roughness: 0.3,
      metalness: 0.2,
    });

    // 1. Torso & High-Vis Vest
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.65, 0.3);
    this.torso = new THREE.Mesh(torsoGeo, vestMat);
    this.torso.position.set(0, 1.15, 0);
    this.torso.castShadow = true;

    // Reflective Stripes on vest
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.31), stripeMat);
    stripe1.position.set(0, 0.05, 0);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.31), stripeMat);
    stripe2.position.set(0, -0.15, 0);
    this.torso.add(stripe1, stripe2);
    this.mesh.add(this.torso);

    // 2. Head & Safety Hard Hat
    const headGeo = new THREE.BoxGeometry(0.24, 0.26, 0.24);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.set(0, 1.62, 0);
    this.head.castShadow = true;

    const helmetGeo = new THREE.CylinderGeometry(0.2, 0.26, 0.16, 12);
    this.helmet = new THREE.Mesh(helmetGeo, helmetMat);
    this.helmet.position.set(0, 0.15, 0);
    this.head.add(this.helmet);

    // Brim of helmet
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.03, 12), helmetMat);
    brim.position.set(0, 0.08, 0.04);
    this.head.add(brim);
    this.mesh.add(this.head);

    // 3. Legs & Work Boots
    const legGeo = new THREE.BoxGeometry(0.2, 0.72, 0.22);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.15, 0.42, 0);
    this.leftLeg.castShadow = true;

    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.32), bootMat);
    leftBoot.position.set(0, -0.32, 0.04);
    leftBoot.castShadow = true;
    this.leftLeg.add(leftBoot);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.15, 0.42, 0);
    this.rightLeg.castShadow = true;

    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.32), bootMat);
    rightBoot.position.set(0, -0.32, 0.04);
    rightBoot.castShadow = true;
    this.rightLeg.add(rightBoot);

    this.mesh.add(this.leftLeg, this.rightLeg);

    // 4. Arms & Work Gloves
    const armGeo = new THREE.BoxGeometry(0.16, 0.6, 0.16);
    this.leftArm = new THREE.Mesh(armGeo, vestMat);
    this.leftArm.position.set(-0.38, 1.15, 0);
    this.leftArm.castShadow = true;

    const leftGlove = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, 0.17), pantsMat);
    leftGlove.position.set(0, -0.28, 0);
    this.leftArm.add(leftGlove);

    this.rightArm = new THREE.Mesh(armGeo, vestMat);
    this.rightArm.position.set(0.38, 1.15, 0);
    this.rightArm.castShadow = true;

    const rightGlove = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, 0.17), pantsMat);
    rightGlove.position.set(0, -0.28, 0);
    this.rightArm.add(rightGlove);

    this.mesh.add(this.leftArm, this.rightArm);

    // 5. High-Power Inspection Flashlight / Spot
    this.flashlightLight = new THREE.SpotLight(0xfff5e6, 3.5, 35, Math.PI / 5, 0.35);
    this.flashlightLight.position.set(0.2, 1.4, 0.2);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(0, 1.0, 15);
    this.mesh.add(targetObj);
    this.flashlightLight.target = targetObj;
    this.mesh.add(this.flashlightLight);

    this.setPosition(startX, this.position.y, startZ, startRot);

    // Bind keyboard event listeners
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  public setPosition(x: number, y: number, z: number, rotation = this.rotation) {
    this.position.set(x, y, z);
    this.rotation = rotation;
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.y = rotation;
  }

  public toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    this.flashlightLight.intensity = this.flashlightOn ? 3.5 : 0;
  }

  public toggleViewMode() {
    this.viewMode = this.viewMode === 'third_person' ? 'first_person' : 'third_person';
    // Hide mesh in first-person mode so camera doesn't clip into head
    this.mesh.visible = this.viewMode === 'third_person';
    return this.viewMode;
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Ignore input when focused in text fields
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
      case 'Space':
        if (!this.isJumping) {
          this.isJumping = true;
          this.verticalVelocity = 6.2; // Jump force
        }
        break;
      case 'KeyL':
        this.toggleFlashlight();
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
    }
  }

  public update(delta: number, active: boolean) {
    if (!active) {
      this.mesh.visible = false;
      this.currentSpeed = 0;
      return;
    }

    this.mesh.visible = this.viewMode === 'third_person';

    // 1. Steering / Rotation
    const turnRate = 2.4 * delta;
    if (this.keys.left) {
      this.rotation += turnRate;
    }
    if (this.keys.right) {
      this.rotation -= turnRate;
    }

    // 2. Linear Movement
    const baseWalkSpeed = 5.2; // 5.2 km/h (~1.45 m/s)
    const sprintSpeed = 16.5; // 16.5 km/h (~4.6 m/s)
    let moveSpeed = (this.keys.sprint && this.stamina > 10 ? sprintSpeed : baseWalkSpeed) / 3.6; // in m/s

    // Stamina drain / recovery
    if (this.keys.sprint && (this.keys.forward || this.keys.backward)) {
      this.stamina = Math.max(0, this.stamina - delta * 18);
    } else {
      this.stamina = Math.min(100, this.stamina + delta * 12);
    }

    let moveX = 0;
    let moveZ = 0;

    if (this.keys.forward) {
      moveX += Math.sin(this.rotation) * moveSpeed;
      moveZ += Math.cos(this.rotation) * moveSpeed;
    }
    if (this.keys.backward) {
      moveX -= Math.sin(this.rotation) * moveSpeed * 0.65;
      moveZ -= Math.cos(this.rotation) * moveSpeed * 0.65;
    }

    // Move player coordinates
    this.position.x += moveX * delta;
    this.position.z += moveZ * delta;

    const moving = Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01;
    this.isWalking = moving;
    this.isSprinting = this.keys.sprint && moving;
    this.currentSpeed = moving ? (this.isSprinting ? sprintSpeed : baseWalkSpeed) : 0;

    if (moving) {
      const dist = moveSpeed * delta;
      this.distanceWalked += dist;
      this.stepsCount += dist * 1.4;
    }

    // 3. Terrain Height & Jump Gravity
    const groundY = getTerrainHeight(this.position.x, this.position.z);

    if (this.isJumping) {
      this.verticalVelocity -= 18.0 * delta; // Gravity
      this.position.y += this.verticalVelocity * delta;

      if (this.position.y <= groundY) {
        this.position.y = groundY;
        this.isJumping = false;
        this.verticalVelocity = 0;
      }
    } else {
      // Cling to terrain slope smoothly
      this.position.y = THREE.MathUtils.damp(this.position.y, groundY, 16, delta);
    }

    // 4. Update 3D Mesh
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    // 5. Walking Animations
    if (moving && !this.isJumping) {
      const animFreq = this.isSprinting ? 14 : 9;
      this.walkPhase += delta * animFreq;

      const legAngle = Math.sin(this.walkPhase) * (this.isSprinting ? 0.75 : 0.45);
      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      this.leftArm.rotation.x = -legAngle * 0.8;
      this.rightArm.rotation.x = legAngle * 0.8;

      // Torso vertical bounce
      this.torso.position.y = 1.15 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.04;
      this.head.position.y = 1.62 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.03;
    } else if (!this.isJumping) {
      // Idle pose
      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, 0, 10, delta);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, 0, 10, delta);
      this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, 0, 10, delta);
      this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, 0, 10, delta);
      this.torso.position.y = 1.15 + Math.sin(Date.now() * 0.002) * 0.01;
      this.head.position.y = 1.62 + Math.sin(Date.now() * 0.002) * 0.01;
    }
  }

  public getDistanceTo(x: number, z: number): number {
    const dx = this.position.x - x;
    const dz = this.position.z - z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  public dispose() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }
}
