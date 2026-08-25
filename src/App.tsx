import React, { useState, useCallback } from 'react';
import { WorldCanvas } from './components/WorldCanvas';
import { InspectionHUD } from './components/InspectionHUD';
import {
  CameraViewMode,
  EngineeringStructure,
  ExplorationMode,
  TrafficBlip,
  VehicleModelType,
  ZoneInfo,
} from './types';
import { VEHICLE_CATALOG } from './engine/vehicleController';

export default function App() {
  const [mode, setMode] = useState<ExplorationMode>('drive');
  const [cameraView, setCameraView] = useState<CameraViewMode>('third_elevated');
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleModelType>('suv');
  const [headlightsOn, setHeadlightsOn] = useState(true);

  const [selectedStructure, setSelectedStructure] = useState<EngineeringStructure | null>(null);
  const [focusTarget, setFocusTarget] = useState<{
    pos: [number, number, number];
    lookAt: [number, number, number];
  } | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'golden' | 'dusk'>('golden');

  // Vehicle Telemetry & Live Traffic
  const [vehicleSpeed, setVehicleSpeed] = useState(0);
  const [vehicleGear, setVehicleGear] = useState('D');
  const [vehicleRpm, setVehicleRpm] = useState(800);
  const [vehicleX, setVehicleX] = useState(-60);
  const [vehicleZ, setVehicleZ] = useState(0);
  const [vehicleRotation, setVehicleRotation] = useState(Math.PI / 2);
  const [trafficList, setTrafficList] = useState<TrafficBlip[]>([]);
  const [maxSpeed, setMaxSpeed] = useState(110);
  const [teleportVehicleTarget, setTeleportVehicleTarget] = useState<{
    x: number;
    z: number;
    y?: number;
  } | null>(null);

  // Walking Telemetry
  const [walkingSteps, setWalkingSteps] = useState(0);
  const [walkingDistance, setWalkingDistance] = useState(0);
  const [walkingStamina, setWalkingStamina] = useState(100);
  const [isNearVehicle, setIsNearVehicle] = useState(true);

  const handleSelectStructure = (structure: EngineeringStructure | null) => {
    setSelectedStructure(structure);
    if (structure) {
      const [px, py, pz] = structure.position;
      const targetLook = structure.targetLookAt || [px, py + 10, pz];
      setFocusTarget({
        pos: [px + 45, py + 35, pz + 45],
        lookAt: targetLook,
      });
    } else {
      setFocusTarget(null);
    }
  };

  const handleTeleportZone = (zone: ZoneInfo) => {
    setFocusTarget({
      pos: zone.cameraPos,
      lookAt: zone.lookAt,
    });
    setTeleportVehicleTarget({
      x: zone.position[0],
      z: zone.position[2],
      y: zone.position[1] + 1,
    });
    setSelectedStructure(null);
  };

  const handleTeleportToCoord = (x: number, z: number) => {
    setTeleportVehicleTarget({ x, z });
    setFocusTarget(null);
  };

  const handleVehicleUpdate = useCallback(
    (
      speed: number,
      gear: string,
      rpm: number,
      x: number,
      z: number,
      rotation: number,
      traffic: TrafficBlip[],
      vMaxSpeed: number
    ) => {
      setVehicleSpeed(speed);
      setVehicleGear(gear);
      setVehicleRpm(rpm);
      setVehicleX(x);
      setVehicleZ(z);
      setVehicleRotation(rotation);
      setTrafficList(traffic);
      setMaxSpeed(vMaxSpeed);
    },
    []
  );

  const handleWalkingUpdate = useCallback(
    (
      speed: number,
      steps: number,
      distance: number,
      stamina: number,
      nearCar: boolean
    ) => {
      setWalkingSteps(steps);
      setWalkingDistance(distance);
      setWalkingStamina(stamina);
      setIsNearVehicle(nearCar);
    },
    []
  );

  const handleSetMode = (newMode: ExplorationMode) => {
    setMode(newMode);
    setFocusTarget(null);
  };

  // Camera cycle on "C" key or button
  const handleCycleCamera = () => {
    const views: CameraViewMode[] = [
      'third_elevated',
      'driver_cockpit',
      'hood_bumper',
      'third_close',
      'top_down',
    ];
    const currentIndex = views.indexOf(cameraView);
    const nextIndex = (currentIndex + 1) % views.length;
    setCameraView(views[nextIndex]);
  };

  const handleToggleHeadlights = () => {
    setHeadlightsOn((prev) => !prev);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none font-sans">
      {/* 3D WebGL Engineering World */}
      <WorldCanvas
        mode={mode}
        onToggleMode={handleSetMode}
        cameraView={cameraView}
        selectedVehicleType={selectedVehicleType}
        headlightsOn={headlightsOn}
        selectedStructure={selectedStructure}
        onSelectStructure={handleSelectStructure}
        onVehicleUpdate={handleVehicleUpdate}
        onWalkingUpdate={handleWalkingUpdate}
        focusTarget={focusTarget}
        timeOfDay={timeOfDay}
        teleportVehicleTarget={teleportVehicleTarget}
        onCycleCamera={handleCycleCamera}
        onToggleHeadlights={handleToggleHeadlights}
      />

      {/* Floating Minimalist Icon HUD & Real Duplicate Mini-Map */}
      <InspectionHUD
        mode={mode}
        onSetMode={handleSetMode}
        cameraView={cameraView}
        onSetCameraView={setCameraView}
        onCycleCamera={handleCycleCamera}
        selectedVehicleType={selectedVehicleType}
        onSelectVehicleType={setSelectedVehicleType}
        headlightsOn={headlightsOn}
        onToggleHeadlights={handleToggleHeadlights}
        selectedStructure={selectedStructure}
        onSelectStructure={handleSelectStructure}
        onTeleportZone={handleTeleportZone}
        onTeleportToCoord={handleTeleportToCoord}
        vehicleSpeed={vehicleSpeed}
        vehicleGear={vehicleGear}
        vehicleRpm={vehicleRpm}
        vehicleX={vehicleX}
        vehicleZ={vehicleZ}
        vehicleRotation={vehicleRotation}
        trafficList={trafficList}
        timeOfDay={timeOfDay}
        onSetTimeOfDay={setTimeOfDay}
        maxSpeed={maxSpeed}
        walkingSteps={walkingSteps}
        walkingDistance={walkingDistance}
        walkingStamina={walkingStamina}
        isNearVehicle={isNearVehicle}
      />
    </main>
  );
}
