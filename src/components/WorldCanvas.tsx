import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildEngineeringWorld, WorldObjects } from '../engine/worldBuilder';
import { VehicleController, VEHICLE_CATALOG } from '../engine/vehicleController';
import { WalkingController } from '../engine/walkingController';
import { TrafficSystem } from '../engine/trafficSystem';
import { getTerrainHeight, HALF_MAP } from '../engine/terrainEngine';
import { CameraViewMode, EngineeringStructure, ExplorationMode, TrafficBlip, VehicleModelType } from '../types';
import { ENGINEERING_STRUCTURES } from '../data/engineeringData';

interface WorldCanvasProps {
  mode: ExplorationMode;
  onToggleMode?: (mode: ExplorationMode) => void;
  cameraView: CameraViewMode;
  selectedVehicleType: VehicleModelType;
  headlightsOn: boolean;
  selectedStructure: EngineeringStructure | null;
  onSelectStructure: (structure: EngineeringStructure | null) => void;
  onVehicleUpdate: (
    speed: number,
    gear: string,
    rpm: number,
    x: number,
    z: number,
    rotation: number,
    traffic: TrafficBlip[],
    maxSpeed: number
  ) => void;
  onWalkingUpdate?: (
    speed: number,
    steps: number,
    distance: number,
    stamina: number,
    isNearVehicle: boolean
  ) => void;
  focusTarget: { pos: [number, number, number]; lookAt: [number, number, number] } | null;
  timeOfDay: 'day' | 'golden' | 'dusk';
  teleportVehicleTarget?: { x: number; z: number; y?: number } | null;
  onCycleCamera?: () => void;
  onToggleHeadlights?: () => void;
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({
  mode,
  onToggleMode,
  cameraView,
  selectedVehicleType,
  headlightsOn,
  selectedStructure,
  onSelectStructure,
  onVehicleUpdate,
  onWalkingUpdate,
  focusTarget,
  timeOfDay,
  teleportVehicleTarget,
  onCycleCamera,
  onToggleHeadlights,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vehicleRef = useRef<VehicleController | null>(null);
  const walkingRef = useRef<WalkingController | null>(null);
  const trafficRef = useRef<TrafficSystem | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  // Dynamic state refs to prevent re-mounting the entire scene
  const modeRef = useRef<ExplorationMode>(mode);
  modeRef.current = mode;
  const prevModeRef = useRef<ExplorationMode>(mode);

  const cameraViewRef = useRef<CameraViewMode>(cameraView);
  cameraViewRef.current = cameraView;

  const focusTargetRef = useRef(focusTarget);
  focusTargetRef.current = focusTarget;

  const onToggleModeRef = useRef(onToggleMode);
  onToggleModeRef.current = onToggleMode;

  const onCycleCameraRef = useRef(onCycleCamera);
  onCycleCameraRef.current = onCycleCamera;

  const onToggleHeadlightsRef = useRef(onToggleHeadlights);
  onToggleHeadlightsRef.current = onToggleHeadlights;

  const onVehicleUpdateRef = useRef(onVehicleUpdate);
  onVehicleUpdateRef.current = onVehicleUpdate;

  const onWalkingUpdateRef = useRef(onWalkingUpdate);
  onWalkingUpdateRef.current = onWalkingUpdate;

  // Mouse orbit offsets
  const mouseOrbit = useRef({ yaw: 0, pitch: 0.28, distance: 26 });
  const isMouseDown = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });

  const droneTarget = useRef({ x: 0, z: 0 });
  const droneKeys = useRef<{ [code: string]: boolean }>({});

  // Handle vehicle type change
  useEffect(() => {
    if (vehicleRef.current) {
      vehicleRef.current.setVehicleType(selectedVehicleType);
    }
  }, [selectedVehicleType]);

  // Handle headlights toggle
  useEffect(() => {
    if (vehicleRef.current) {
      vehicleRef.current.setHeadlights(headlightsOn);
    }
  }, [headlightsOn]);

  // Handle vehicle teleportation request from mini-map or zone select
  useEffect(() => {
    if (teleportVehicleTarget && vehicleRef.current) {
      const targetY = teleportVehicleTarget.y ?? getTerrainHeight(teleportVehicleTarget.x, teleportVehicleTarget.z);
      vehicleRef.current.setPosition(teleportVehicleTarget.x, targetY + 0.1, teleportVehicleTarget.z);
    }
  }, [teleportVehicleTarget]);

  // Handle smooth Mode transitions (Drive <-> Walk) without reloading the 3D scene
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      if (mode === 'walk' && prevModeRef.current === 'drive' && vehicleRef.current && walkingRef.current) {
        const vState = vehicleRef.current.state;
        const exitX = vState.x + Math.cos(vState.rotation) * 2.4;
        const exitZ = vState.z - Math.sin(vState.rotation) * 2.4;
        const exitY = getTerrainHeight(exitX, exitZ);
        walkingRef.current.setPosition(exitX, exitY, exitZ, vState.rotation);
        walkingRef.current.mesh.visible = true;
      } else if (mode === 'drive' && walkingRef.current) {
        walkingRef.current.mesh.visible = false;
      }
      prevModeRef.current = mode;
    }
  }, [mode]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Atmospheric Fog across 6km landscape
    scene.fog = new THREE.FogExp2(0xcfdde8, 0.00035);
    scene.background = new THREE.Color(0xcfdde8);

    // 2. Camera Setup (Range up to 7500m for 6km panoramic views)
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.4, 7500);
    camera.position.set(0, 16, -18);
    cameraRef.current = camera;

    // 3. Renderer Setup (Photorealistic Settings)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 4. Photorealistic Environmental Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3d493a, 0.75);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    sunLight.position.set(220, 240, 180);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 800;
    sunLight.shadow.camera.left = -280;
    sunLight.shadow.camera.right = 280;
    sunLight.shadow.camera.top = 280;
    sunLight.shadow.camera.bottom = -280;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const ambientLight = new THREE.AmbientLight(0xdde6f0, 0.4);
    scene.add(ambientLight);

    // 5. Build 3D Engineering Infrastructure World
    const world: WorldObjects = buildEngineeringWorld(scene);

    // 6. Ground Inspection Vehicle Setup
    const vehicle = new VehicleController(selectedVehicleType);
    vehicle.setPosition(-60, 12.2, 0, Math.PI / 2);
    vehicle.setHeadlights(headlightsOn);
    scene.add(vehicle.mesh);
    vehicleRef.current = vehicle;

    // 6b. Walking Character Controller Setup
    const walking = new WalkingController(-58, 0, Math.PI / 2);
    scene.add(walking.mesh);
    walkingRef.current = walking;

    // 6c. Ambient AI Traffic System
    const traffic = new TrafficSystem(scene);
    trafficRef.current = traffic;

    // 7. Raycasting & Object Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: MouseEvent) => {
      isMouseDown.current = true;
      prevMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isMouseDown.current = false;
    };

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isMouseDown.current) {
        const dx = e.clientX - prevMousePos.current.x;
        const dy = e.clientY - prevMousePos.current.y;
        mouseOrbit.current.yaw -= dx * 0.005;
        mouseOrbit.current.pitch = Math.max(
          0.05,
          Math.min(Math.PI / 2 - 0.05, mouseOrbit.current.pitch + dy * 0.005)
        );
        prevMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onWheel = (e: WheelEvent) => {
      mouseOrbit.current.distance = Math.max(
        6,
        Math.min(130, mouseOrbit.current.distance + e.deltaY * 0.04)
      );
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clickMouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(clickMouse, camera);
      const intersects = raycaster.intersectObjects(world.interactiveObjects, true);

      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object;
        let foundId: string | null = null;
        while (current && current !== scene) {
          if (current.userData && current.userData.engineeringId) {
            foundId = current.userData.engineeringId;
            break;
          }
          current = current.parent;
        }

        if (foundId) {
          const struct = ENGINEERING_STRUCTURES.find((s) => s.id === foundId);
          if (struct) {
            onSelectStructure(struct);
          }
        }
      }
    };

    // Keyboard Shortcuts (C for Camera cycle, L for lights, F/E for Exit/Enter vehicle)
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      droneKeys.current[e.code] = true;

      if (e.key === 'c' || e.key === 'C') {
        if (modeRef.current === 'walk' && walkingRef.current) {
          walkingRef.current.toggleViewMode();
        } else if (onCycleCameraRef.current) {
          onCycleCameraRef.current();
        }
      }
      if (e.key === 'l' || e.key === 'L') {
        if (onToggleHeadlightsRef.current) onToggleHeadlightsRef.current();
      }
      // Enter / Exit Vehicle with F or E key
      if (e.key === 'f' || e.key === 'F' || e.key === 'e' || e.key === 'E') {
        if (modeRef.current === 'drive' && vehicleRef.current && walkingRef.current && onToggleModeRef.current) {
          const vState = vehicleRef.current.state;
          const exitX = vState.x + Math.cos(vState.rotation) * 2.4;
          const exitZ = vState.z - Math.sin(vState.rotation) * 2.4;
          const exitY = getTerrainHeight(exitX, exitZ);
          walkingRef.current.setPosition(exitX, exitY, exitZ, vState.rotation);
          onToggleModeRef.current('walk');
        } else if (modeRef.current === 'walk' && vehicleRef.current && walkingRef.current && onToggleModeRef.current) {
          const dist = walkingRef.current.getDistanceTo(vehicleRef.current.state.x, vehicleRef.current.state.z);
          if (dist <= 6.5) {
            onToggleModeRef.current('drive');
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      droneKeys.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);
    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('wheel', onWheel, { passive: true });
    container.addEventListener('click', onClick);

    // 8. Resize Handler
    const onResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 9. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let smoothCamPos = new THREE.Vector3(0, 16, -18);
    let smoothLookAt = new THREE.Vector3(0, 12, 0);

    // Frame-rate independent camera smoothing — never overshoots, unlike
    // raw .lerp(target, delta * speed) whose alpha has no upper bound.
    const dampVec3 = (current: THREE.Vector3, target: THREE.Vector3, lambda: number, delta: number) => {
      current.x = THREE.MathUtils.damp(current.x, target.x, lambda, delta);
      current.y = THREE.MathUtils.damp(current.y, target.y, lambda, delta);
      current.z = THREE.MathUtils.damp(current.z, target.z, lambda, delta);
    };

    // Throttle HUD telemetry callbacks (each one fans out to ~8 React setState
    // calls in App.tsx) to ~15Hz instead of the full 60fps render loop, so the
    // HUD/minimap re-render far less often while still feeling responsive.
    const HUD_UPDATE_INTERVAL = 1 / 15;
    let lastHudUpdateTime = -Infinity;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      // Update world animations (water ripples, crane slewing, wind turbine blades, tractors)
      world.animatables.forEach((a) => a.update(time, delta));

      // Update ambient AI road traffic
      if (traffic) {
        traffic.update(delta);
      }

      // Mode: WALKING ON FOOT
      if (modeRef.current === 'walk' && walking && vehicle) {
        walking.update(delta, true);
        vehicle.update(delta, time); // Vehicle stays in neutral / idles

        const distToCar = walking.getDistanceTo(vehicle.state.x, vehicle.state.z);
        const nearCar = distToCar <= 6.5;

        if (time - lastHudUpdateTime >= HUD_UPDATE_INTERVAL) {
          lastHudUpdateTime = time;
          if (onWalkingUpdateRef.current) {
            onWalkingUpdateRef.current(
              Math.round(walking.currentSpeed),
              Math.round(walking.stepsCount),
              Math.round(walking.distanceWalked),
              Math.round(walking.stamina),
              nearCar
            );
          }

          onVehicleUpdateRef.current(
            Math.round(walking.currentSpeed),
            'WALK',
            0,
            walking.position.x,
            walking.position.z,
            walking.rotation,
            traffic ? traffic.getLiveTrafficPositions() : [],
            18
          );
        }

        // Walking Camera Tracking
        if (walking.viewMode === 'first_person') {
          // 1. First-Person Head / Eye View
          const eyeY = walking.position.y + 1.68;
          const lookX = walking.position.x + Math.sin(walking.rotation) * 30;
          const lookZ = walking.position.z + Math.cos(walking.rotation) * 30;

          smoothCamPos.lerp(new THREE.Vector3(walking.position.x, eyeY, walking.position.z), delta * 20.0);
          smoothLookAt.lerp(new THREE.Vector3(lookX, eyeY - 0.2, lookZ), delta * 20.0);

          camera.position.copy(smoothCamPos);
          camera.lookAt(smoothLookAt);
        } else {
          // 2. Third-Person Over-The-Shoulder / Follow Camera
          if (!isMouseDown.current) {
            mouseOrbit.current.yaw = THREE.MathUtils.damp(mouseOrbit.current.yaw, 0, 4.0, delta);
          }
          const orbitYaw = mouseOrbit.current.yaw;
          const totalYaw = walking.rotation + orbitYaw;
          const dist = 4.2;

          const camX = walking.position.x - Math.sin(totalYaw) * dist;
          const camY = walking.position.y + 2.1 + mouseOrbit.current.pitch * 1.5;
          const camZ = walking.position.z - Math.cos(totalYaw) * dist;

          const lookX = walking.position.x + Math.sin(walking.rotation) * 3;
          const lookY = walking.position.y + 1.5;
          const lookZ = walking.position.z + Math.cos(walking.rotation) * 3;

          smoothCamPos.lerp(new THREE.Vector3(camX, camY, camZ), delta * 12.0);
          smoothLookAt.lerp(new THREE.Vector3(lookX, lookY, lookZ), delta * 14.0);

          camera.position.copy(smoothCamPos);
          camera.lookAt(smoothLookAt);
        }
      }
      // Mode: VEHICLE DRIVING
      else if (modeRef.current === 'drive' && vehicle && walking) {
        walking.update(delta, false);
        vehicle.update(delta, time);
        onVehicleUpdateRef.current(
          Math.round(vehicle.state.speed),
          vehicle.state.gear,
          vehicle.state.rpm,
          vehicle.state.x,
          vehicle.state.z,
          vehicle.state.rotation,
          traffic ? traffic.getLiveTrafficPositions() : [],
          vehicle.currentVehicleDef.maxSpeed
        );

        const focusTarget = focusTargetRef.current;
        if (focusTarget) {
          // Focused transition to a specific engineering structure
          const targetPos = new THREE.Vector3(...focusTarget.pos);
          const targetLook = new THREE.Vector3(...focusTarget.lookAt);
          smoothCamPos.lerp(targetPos, delta * 3.0);
          smoothLookAt.lerp(targetLook, delta * 3.5);
          camera.position.copy(smoothCamPos);
          camera.lookAt(smoothLookAt);
        } else {
          const carRot = vehicle.state.rotation;
          const vDef = vehicle.currentVehicleDef;
          const cameraView = cameraViewRef.current;

          if (cameraView === 'driver_cockpit') {
            // 1. DRIVER EYE COCKPIT VIEW (Inside windshield looking forward)
            const eyeX = vehicle.state.x + Math.sin(carRot) * vDef.cockpitForward - Math.cos(carRot) * 0.35;
            const eyeY = vehicle.state.y + vDef.cockpitHeight;
            const eyeZ = vehicle.state.z + Math.cos(carRot) * vDef.cockpitForward + Math.sin(carRot) * 0.35;

            const lookX = vehicle.state.x + Math.sin(carRot) * 40;
            const lookY = vehicle.state.y + vDef.cockpitHeight - 0.2;
            const lookZ = vehicle.state.z + Math.cos(carRot) * 40;

            const targetCam = new THREE.Vector3(eyeX, eyeY, eyeZ);
            const targetLook = new THREE.Vector3(lookX, lookY, lookZ);

            dampVec3(smoothCamPos, targetCam, 25.0, delta);
            smoothLookAt.lerp(targetLook, delta * 25.0);

            camera.position.copy(smoothCamPos);
            camera.lookAt(smoothLookAt);
          } else if (cameraView === 'hood_bumper') {
            // 2. HOOD / BUMPER CAM
            const bumperX = vehicle.state.x + Math.sin(carRot) * 2.2;
            const bumperY = vehicle.state.y + 0.75;
            const bumperZ = vehicle.state.z + Math.cos(carRot) * 2.2;

            const lookX = vehicle.state.x + Math.sin(carRot) * 35;
            const lookY = vehicle.state.y + 0.6;
            const lookZ = vehicle.state.z + Math.cos(carRot) * 35;

            smoothCamPos.lerp(new THREE.Vector3(bumperX, bumperY, bumperZ), delta * 22.0);
            smoothLookAt.lerp(new THREE.Vector3(lookX, lookY, lookZ), delta * 22.0);

            camera.position.copy(smoothCamPos);
            camera.lookAt(smoothLookAt);
          } else if (cameraView === 'third_close') {
            // 3. CLOSE THIRD-PERSON ACTION CHASE
            const dist = 12.0;
            const camHeight = 3.8;
            const lookAhead = 10.0;

            const camX = vehicle.state.x - Math.sin(carRot) * dist;
            const camY = vehicle.state.y + camHeight;
            const camZ = vehicle.state.z - Math.cos(carRot) * dist;

            const lookX = vehicle.state.x + Math.sin(carRot) * lookAhead;
            const lookY = vehicle.state.y + 1.6;
            const lookZ = vehicle.state.z + Math.cos(carRot) * lookAhead;

            smoothCamPos.lerp(new THREE.Vector3(camX, camY, camZ), delta * 12.0);
            smoothLookAt.lerp(new THREE.Vector3(lookX, lookY, lookZ), delta * 14.0);

            camera.position.copy(smoothCamPos);
            camera.lookAt(smoothLookAt);
          } else if (cameraView === 'top_down') {
            // 4. TOP-DOWN TACTICAL SATELLITE CHASE
            const camX = vehicle.state.x - Math.sin(carRot) * 6;
            const camY = vehicle.state.y + 45;
            const camZ = vehicle.state.z - Math.cos(carRot) * 6;

            smoothCamPos.lerp(new THREE.Vector3(camX, camY, camZ), delta * 8.0);
            smoothLookAt.lerp(new THREE.Vector3(vehicle.state.x, vehicle.state.y, vehicle.state.z), delta * 9.0);

            camera.position.copy(smoothCamPos);
            camera.lookAt(smoothLookAt);
          } else {
            // 5. GRAND ELEVATED CHASE
            if (!isMouseDown.current) {
              mouseOrbit.current.yaw = THREE.MathUtils.damp(mouseOrbit.current.yaw, 0, 4.0, delta);
            }

            const orbitYaw = mouseOrbit.current.yaw;
            const totalYaw = carRot + orbitYaw;

            const dist = Math.max(22, mouseOrbit.current.distance);
            const camHeight = 8.0;
            const lookAheadDist = 12.0;

            const camX = vehicle.state.x - Math.sin(totalYaw) * dist;
            const camY = vehicle.state.y + camHeight;
            const camZ = vehicle.state.z - Math.cos(totalYaw) * dist;

            const lookX = vehicle.state.x + Math.sin(carRot) * lookAheadDist;
            const lookY = vehicle.state.y + 2.5;
            const lookZ = vehicle.state.z + Math.cos(carRot) * lookAheadDist;

            smoothCamPos.lerp(new THREE.Vector3(camX, camY, camZ), delta * 8.5);
            smoothLookAt.lerp(new THREE.Vector3(lookX, lookY, lookZ), delta * 10.0);

            camera.position.copy(smoothCamPos);
            camera.lookAt(smoothLookAt);
          }
        }
      } else if (modeRef.current === 'drone') {
        const orbitYaw = mouseOrbit.current.yaw;
        const fwdX = -Math.sin(orbitYaw);
        const fwdZ = -Math.cos(orbitYaw);
        const rightX = Math.cos(orbitYaw);
        const rightZ = -Math.sin(orbitYaw);

        let moveX = 0;
        let moveZ = 0;
        if (droneKeys.current['KeyW'] || droneKeys.current['ArrowUp']) { moveX += fwdX; moveZ += fwdZ; }
        if (droneKeys.current['KeyS'] || droneKeys.current['ArrowDown']) { moveX -= fwdX; moveZ -= fwdZ; }
        if (droneKeys.current['KeyD'] || droneKeys.current['ArrowRight']) { moveX += rightX; moveZ += rightZ; }
        if (droneKeys.current['KeyA'] || droneKeys.current['ArrowLeft']) { moveX -= rightX; moveZ -= rightZ; }

        const moveLen = Math.hypot(moveX, moveZ);
        if (moveLen > 0.001) {
          const boost = droneKeys.current['ShiftLeft'] || droneKeys.current['ShiftRight'] ? 3.0 : 1.0;
          const droneSpeed = 180 * boost;
          droneTarget.current.x += (moveX / moveLen) * droneSpeed * delta;
          droneTarget.current.z += (moveZ / moveLen) * droneSpeed * delta;
          droneTarget.current.x = THREE.MathUtils.clamp(droneTarget.current.x, -HALF_MAP, HALF_MAP);
          droneTarget.current.z = THREE.MathUtils.clamp(droneTarget.current.z, -HALF_MAP, HALF_MAP);
        }

        const orbitPitch = Math.max(0.2, mouseOrbit.current.pitch);
        const dist = mouseOrbit.current.distance * 2.8;
        const groundY = getTerrainHeight(droneTarget.current.x, droneTarget.current.z);

        const camX = droneTarget.current.x + Math.sin(orbitYaw) * Math.cos(orbitPitch) * dist;
        const camY = groundY + Math.sin(orbitPitch) * dist + 45;
        const camZ = droneTarget.current.z + Math.cos(orbitYaw) * Math.cos(orbitPitch) * dist;

        const droneTargetPos = new THREE.Vector3(camX, camY, camZ);
        const droneLookAt = new THREE.Vector3(droneTarget.current.x, groundY + 10, droneTarget.current.z);

        dampVec3(smoothCamPos, droneTargetPos, 4.5, delta);
        dampVec3(smoothLookAt, droneLookAt, 4.5, delta);

        camera.position.copy(smoothCamPos);
        camera.lookAt(smoothLookAt);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);
      if (walkingRef.current) {
        walkingRef.current.dispose();
      }
      if (vehicleRef.current) {
        vehicleRef.current.dispose();
      }
      // Release every GPU geometry/material/texture allocated for the world so the
      // WebGL context doesn't leak VRAM if this component ever unmounts/remounts.
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = (mesh as any).material as THREE.Material | THREE.Material[] | undefined;
        if (material) {
          const materials = Array.isArray(material) ? material : [material];
          materials.forEach((m) => {
            Object.values(m).forEach((value) => {
              if (value && typeof value === 'object' && 'isTexture' in value) {
                (value as THREE.Texture).dispose();
              }
            });
            m.dispose();
          });
        }
      });
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
    // Mount once: cameraView / selectedVehicleType / mode changes are handled by
    // dedicated lightweight effects + refs above instead of rebuilding the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update Lighting according to Time of Day
  useEffect(() => {
    if (!sunLightRef.current || !sceneRef.current || !hemiLightRef.current) return;
    const scene = sceneRef.current;
    const sun = sunLightRef.current;
    const hemi = hemiLightRef.current;

    if (timeOfDay === 'golden') {
      scene.background = new THREE.Color(0xf6d8ae);
      scene.fog = new THREE.FogExp2(0xf6d8ae, 0.0015);
      sun.color = new THREE.Color(0xffaa55);
      sun.intensity = 2.8;
      sun.position.set(300, 120, 200);
      hemi.color = new THREE.Color(0xffe2bf);
      hemi.groundColor = new THREE.Color(0x3a2618);
    } else if (timeOfDay === 'dusk') {
      scene.background = new THREE.Color(0x232936);
      scene.fog = new THREE.FogExp2(0x232936, 0.002);
      sun.color = new THREE.Color(0xf39c12);
      sun.intensity = 1.2;
      sun.position.set(350, 40, 250);
      hemi.color = new THREE.Color(0x4a5568);
      hemi.groundColor = new THREE.Color(0x1a202c);
    } else {
      scene.background = new THREE.Color(0xcfdde8);
      scene.fog = new THREE.FogExp2(0xcfdde8, 0.0016);
      sun.color = new THREE.Color(0xfff1dc);
      sun.intensity = 2.2;
      sun.position.set(220, 240, 180);
      hemi.color = new THREE.Color(0xffffff);
      hemi.groundColor = new THREE.Color(0x3d493a);
    }
  }, [timeOfDay]);

  return (
    <div
      ref={containerRef}
      id="uele-3d-world-viewport"
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden"
    />
  );
};
