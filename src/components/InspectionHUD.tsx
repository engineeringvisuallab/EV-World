import React, { useState } from 'react';
import {
  Car,
  Eye,
  Sun,
  Sunset,
  Moon,
  Layers,
  MapPin,
  X,
  Compass,
  CheckCircle2,
  Clock,
  ChevronRight,
  Zap,
  Droplets,
  HardHat,
  Anchor,
  Radio,
  Camera,
  Lightbulb,
  Truck,
  Gauge,
  Footprints,
  LogOut,
  LogIn,
} from 'lucide-react';
import {
  CameraViewMode,
  EngineeringStructure,
  ExplorationMode,
  TrafficBlip,
  VehicleModelType,
  ZoneInfo,
} from '../types';
import { ENGINEERING_ZONES } from '../data/engineeringData';
import { VEHICLE_CATALOG } from '../engine/vehicleController';
import { SiteMiniMap } from './SiteMiniMap';

interface InspectionHUDProps {
  mode: ExplorationMode;
  onSetMode: (mode: ExplorationMode) => void;
  cameraView: CameraViewMode;
  onSetCameraView: (view: CameraViewMode) => void;
  onCycleCamera: () => void;
  selectedVehicleType: VehicleModelType;
  onSelectVehicleType: (type: VehicleModelType) => void;
  headlightsOn: boolean;
  onToggleHeadlights: () => void;
  selectedStructure: EngineeringStructure | null;
  onSelectStructure: (struct: EngineeringStructure | null) => void;
  onTeleportZone: (zone: ZoneInfo) => void;
  onTeleportToCoord: (x: number, z: number) => void;
  vehicleSpeed: number;
  vehicleGear: string;
  vehicleRpm: number;
  vehicleX: number;
  vehicleZ: number;
  vehicleRotation: number;
  trafficList: TrafficBlip[];
  timeOfDay: 'day' | 'golden' | 'dusk';
  onSetTimeOfDay: (time: 'day' | 'golden' | 'dusk') => void;
  maxSpeed: number;
  walkingSteps?: number;
  walkingDistance?: number;
  walkingStamina?: number;
  isNearVehicle?: boolean;
}

export const InspectionHUD: React.FC<InspectionHUDProps> = ({
  mode,
  onSetMode,
  cameraView,
  onSetCameraView,
  onCycleCamera,
  selectedVehicleType,
  onSelectVehicleType,
  headlightsOn,
  onToggleHeadlights,
  selectedStructure,
  onSelectStructure,
  onTeleportZone,
  onTeleportToCoord,
  vehicleSpeed,
  vehicleGear,
  vehicleRpm,
  vehicleX,
  vehicleZ,
  vehicleRotation,
  trafficList,
  timeOfDay,
  onSetTimeOfDay,
  maxSpeed,
  walkingSteps = 0,
  walkingDistance = 0,
  walkingStamina = 100,
  isNearVehicle = true,
}) => {
  const [showZonesMenu, setShowZonesMenu] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showCameraPicker, setShowCameraPicker] = useState(false);

  // Speedometer calculation
  const safeMaxSpeed = maxSpeed || 120;
  const speedRatio = Math.min(1, Math.abs(vehicleSpeed) / safeMaxSpeed);

  // Discipline Icon mapping
  const getDisciplineIcon = (disc: string) => {
    if (disc.includes('Civil') || disc.includes('Structural')) return <HardHat className="w-3.5 h-3.5" />;
    if (disc.includes('Water')) return <Droplets className="w-3.5 h-3.5" />;
    if (disc.includes('Electrical') || disc.includes('Energy')) return <Zap className="w-3.5 h-3.5" />;
    if (disc.includes('Port') || disc.includes('Marine')) return <Anchor className="w-3.5 h-3.5" />;
    if (disc.includes('Survey')) return <Radio className="w-3.5 h-3.5" />;
    return <Compass className="w-3.5 h-3.5" />;
  };

  const cameraLabels: Record<CameraViewMode, string> = {
    third_elevated: 'Elevated Chase',
    driver_cockpit: 'Driver Eye',
    hood_bumper: 'Bumper Cam',
    third_close: 'Close Chase',
    top_down: 'Top Satellite',
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 md:p-5 z-20 font-sans select-none">
      {/* ============================================================ */}
      {/* 1. TOP BAR: MINIMAL ICON-DRIVEN FLOATING TOOLBAR             */}
      {/* ============================================================ */}
      <header className="flex items-center justify-between w-full">
        {/* Left: Minimal Brand Pill */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl px-3.5 py-2 shadow-2xl">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center font-bold text-white text-xs shadow-md">
            U
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white tracking-wider">
            <span>UELE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          </div>
        </div>

        {/* Center: Primary Icon Controls */}
        <nav
          aria-label="Main Controls"
          className="pointer-events-auto flex items-center gap-1 bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-1.5 shadow-2xl text-slate-300"
        >
          {/* Mode: Drive Vehicle */}
          <button
            id="btn-mode-drive"
            title="Drive Mode [Hotkey: F]"
            onClick={() => onSetMode('drive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'drive'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Car className="w-4 h-4" />
            <span className="hidden sm:inline">Drive</span>
          </button>

          {/* Mode: Walk on Foot */}
          <button
            id="btn-mode-walk"
            title="Walking Mode (Explore on Foot) [Hotkey: F]"
            onClick={() => onSetMode('walk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'walk'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Footprints className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Walk</span>
          </button>

          {/* Mode: Aerial Drone (Directly Switchable) */}
          <button
            id="btn-mode-drone"
            title="Aerial Drone View"
            onClick={() => onSetMode('drone')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'drone'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Drone</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Time: Daylight */}
          <button
            id="btn-time-day"
            title="Daylight"
            onClick={() => onSetTimeOfDay('day')}
            className={`p-2 rounded-xl transition-all ${
              timeOfDay === 'day'
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-4 h-4" />
          </button>

          {/* Time: Golden Hour */}
          <button
            id="btn-time-golden"
            title="Golden Hour"
            onClick={() => onSetTimeOfDay('golden')}
            className={`p-2 rounded-xl transition-all ${
              timeOfDay === 'golden'
                ? 'bg-amber-600/40 text-amber-400 border border-amber-500/40'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sunset className="w-4 h-4" />
          </button>

          {/* Time: Dusk / Night */}
          <button
            id="btn-time-dusk"
            title="Dusk / Twilight"
            onClick={() => onSetTimeOfDay('dusk')}
            className={`p-2 rounded-xl transition-all ${
              timeOfDay === 'dusk'
                ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Moon className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Sites Dropdown Toggle */}
          <button
            id="btn-toggle-sites-menu"
            title="Engineering Sites & Zones"
            onClick={() => {
              setShowZonesMenu(!showZonesMenu);
              setShowVehiclePicker(false);
              setShowCameraPicker(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${
              showZonesMenu
                ? 'bg-sky-600 text-white'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-medium hidden sm:inline">Sites</span>
          </button>
        </nav>

        {/* Right: Quick Action Pill (Headlights, Camera "C", Vehicle Switcher) */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-1.5 shadow-2xl">
          {/* Headlights Toggle (L) */}
          <button
            id="btn-toggle-headlights"
            title={headlightsOn ? 'Vehicle Headlights [L] (ON)' : 'Vehicle Headlights [L] (OFF)'}
            onClick={onToggleHeadlights}
            className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
              headlightsOn
                ? 'text-amber-300 bg-amber-500/25 border border-amber-500/40 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
          </button>

          {/* Camera View Switcher (Hotkey: C) */}
          <div className="relative">
            <button
              id="btn-cycle-camera"
              title={
                mode === 'walk'
                  ? 'Switch First / Third Person Camera [C]'
                  : `Camera View: ${cameraLabels[cameraView]} (Press C to switch)`
              }
              onClick={() => {
                if (mode === 'walk') {
                  onCycleCamera();
                } else {
                  setShowCameraPicker(!showCameraPicker);
                  setShowVehiclePicker(false);
                  setShowZonesMenu(false);
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold ${
                showCameraPicker || cameraView === 'driver_cockpit'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Camera className="w-4 h-4 text-sky-400" />
              <span className="font-mono text-[11px] bg-slate-800 px-1 py-0.2 rounded border border-slate-700">C</span>
            </button>

            {/* Camera Views Popup */}
            {showCameraPicker && mode === 'drive' && (
              <div
                id="camera-views-popup"
                className="absolute right-0 top-11 w-48 bg-slate-900/95 backdrop-blur-2xl border border-slate-700 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-40 text-xs"
              >
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Camera Positions</span>
                  <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-sky-300">[C]</span>
                </div>
                {(
                  [
                    { id: 'third_elevated', label: 'Elevated Chase (Wide)' },
                    { id: 'driver_cockpit', label: 'Driver Eye Cockpit' },
                    { id: 'hood_bumper', label: 'Bumper Hood View' },
                    { id: 'third_close', label: 'Close Chase Cam' },
                    { id: 'top_down', label: 'Top Satellite Cam' },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => {
                      onSetCameraView(cam.id);
                      setShowCameraPicker(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl transition ${
                      cameraView === cam.id
                        ? 'bg-sky-600 text-white font-bold'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{cam.label}</span>
                    {cameraView === cam.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Vehicle Switcher Button */}
          <div className="relative">
            <button
              id="btn-vehicle-picker-toggle"
              title="Change Inspection Vehicle"
              onClick={() => {
                setShowVehiclePicker(!showVehiclePicker);
                setShowCameraPicker(false);
                setShowZonesMenu(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all text-xs font-semibold ${
                showVehiclePicker
                  ? 'bg-amber-600 text-white'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Truck className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline font-mono text-[11px]">
                {VEHICLE_CATALOG[selectedVehicleType].name.split(' ')[0]}
              </span>
            </button>

            {/* Vehicle Selection Modal / Dropdown */}
            {showVehiclePicker && (
              <div
                id="vehicle-picker-popup"
                className="absolute right-0 top-11 w-72 bg-slate-900/95 backdrop-blur-2xl border border-slate-700 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-1.5 z-40 text-xs text-slate-200"
              >
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Select Vehicle ({Object.keys(VEHICLE_CATALOG).length} Models)</span>
                  </div>
                  <button
                    onClick={() => setShowVehiclePicker(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pt-1">
                  {(Object.keys(VEHICLE_CATALOG) as VehicleModelType[]).map((vKey) => {
                    const v = VEHICLE_CATALOG[vKey];
                    const isCurrent = selectedVehicleType === vKey;
                    return (
                      <button
                        key={vKey}
                        onClick={() => {
                          onSelectVehicleType(vKey);
                          setShowVehiclePicker(false);
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl border transition text-left ${
                          isCurrent
                            ? 'bg-amber-600/30 border-amber-500/80 text-white shadow-md'
                            : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: v.color }}
                            />
                            <span>{v.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{v.category}</div>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className="font-mono text-xs font-bold text-sky-400">
                            {v.maxSpeed} <span className="text-[9px] text-slate-400">km/h</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. SITES & ZONES FLOATING ICON MENU                          */}
      {/* ============================================================ */}
      {showZonesMenu && (
        <div
          id="zones-dropdown-menu"
          className="pointer-events-auto absolute left-1/2 -translate-x-1/2 top-20 w-80 max-w-[calc(100vw-32px)] max-h-[60vh] overflow-y-auto bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-slate-200 z-30"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-white uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Engineering Sites</span>
            </div>
            <button
              onClick={() => setShowZonesMenu(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            {ENGINEERING_ZONES.map((zone) => (
              <button
                key={zone.id}
                onClick={() => {
                  onTeleportZone(zone);
                  setShowZonesMenu(false);
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/40 hover:bg-sky-600/25 border border-slate-700/40 hover:border-sky-500/50 transition group text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-700/60 text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-sky-300">
                      {zone.name}
                    </div>
                    <div className="text-[10px] text-slate-400">{zone.category}</div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. TECHNICAL SPECIFICATION CARD (CLEAN & ICON-BASED)         */}
      {/* ============================================================ */}
      {selectedStructure && (
        <aside
          id="structure-spec-card"
          className="pointer-events-auto absolute right-3 md:right-5 top-20 w-80 md:w-96 max-h-[78vh] overflow-y-auto bg-slate-900/90 backdrop-blur-2xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-slate-200 z-30"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-400">
                {getDisciplineIcon(selectedStructure.discipline)}
                <span>{selectedStructure.discipline}</span>
              </div>
              <h2 className="text-sm font-bold text-white mt-1 leading-snug">
                {selectedStructure.name}
              </h2>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>{selectedStructure.zone}</span>
              </div>
            </div>

            <button
              id="btn-close-spec-card"
              onClick={() => onSelectStructure(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="my-3 flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
            <div className="flex items-center gap-2">
              {selectedStructure.status === 'Operational' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400" />
              )}
              <span className="font-semibold text-white">{selectedStructure.status}</span>
            </div>
            {selectedStructure.progress !== undefined && (
              <span className="font-mono text-xs font-bold text-amber-300">
                {selectedStructure.progress}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 my-3">
            {selectedStructure.metrics.map((m, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/40 flex flex-col"
              >
                <span className="text-[10px] text-slate-400 truncate">{m.label}</span>
                <span className="text-xs font-bold font-mono text-sky-300 mt-0.5">{m.value}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 text-[11px] my-3 border-t border-slate-800 pt-2.5">
            {selectedStructure.specifications.map((sp, idx) => (
              <div key={idx} className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400 font-medium">{sp.category}</span>
                <span className="font-semibold text-slate-200 text-right">{sp.details}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col gap-2">
            <button
              id="btn-drive-to-structure"
              onClick={() => {
                onTeleportToCoord(
                  selectedStructure.position[0],
                  selectedStructure.position[2]
                );
              }}
              className="flex items-center justify-center gap-2 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-lg shadow-sky-600/30"
            >
              <Car className="w-3.5 h-3.5" />
              <span>Drive Vehicle to Site</span>
            </button>
          </div>
        </aside>
      )}

      {/* ============================================================ */}
      {/* 4. BOTTOM BAR: REAL SITEMAP, ENTER/EXIT PROMPT, & TELEMETRY */}
      {/* ============================================================ */}
      <footer className="flex items-end justify-between w-full">
        {/* Left: Real Topographic Site Mini-Map */}
        <SiteMiniMap
          playerX={vehicleX}
          playerZ={vehicleZ}
          playerRotation={vehicleRotation}
          trafficList={trafficList}
          selectedStructure={selectedStructure}
          onSelectStructure={onSelectStructure}
          onTeleportToCoord={onTeleportToCoord}
          onTeleportZone={onTeleportZone}
          mode={mode}
        />

        {/* Center: Interactive Prompt Pill for Exit / Enter Vehicle */}
        <div className="pointer-events-auto flex items-center gap-2">
          {mode === 'drive' && (
            <button
              id="btn-exit-vehicle"
              onClick={() => onSetMode('walk')}
              title="Exit vehicle and walk on foot [Hotkey: F]"
              className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl border border-amber-500/50 hover:border-amber-400 rounded-full px-4 py-2 shadow-2xl text-amber-200 hover:text-white transition cursor-pointer group"
            >
              <LogOut className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition" />
              <span className="text-xs font-bold">Exit Vehicle</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold">
                F
              </kbd>
            </button>
          )}

          {mode === 'walk' && isNearVehicle && (
            <button
              id="btn-enter-vehicle"
              onClick={() => onSetMode('drive')}
              title="Enter inspection vehicle [Hotkey: F]"
              className="flex items-center gap-2 bg-sky-600/90 hover:bg-sky-500 backdrop-blur-xl border border-sky-400 rounded-full px-4 py-2 shadow-2xl text-white transition cursor-pointer group animate-pulse"
            >
              <LogIn className="w-4 h-4 text-white group-hover:-translate-x-0.5 transition" />
              <span className="text-xs font-bold">Enter Vehicle</span>
              <kbd className="px-1.5 py-0.5 rounded bg-sky-800 border border-sky-400 text-white font-mono text-[10px] font-bold">
                F
              </kbd>
            </button>
          )}

          {/* Camera View Switcher Quick Pill */}
          <button
            id="btn-camera-cycle"
            onClick={onCycleCamera}
            title={mode === 'walk' ? 'Toggle First / Third Person [C]' : 'Cycle Camera View [C]'}
            className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 rounded-full px-3.5 py-2 shadow-2xl text-slate-200 hover:text-white hover:border-sky-400 transition cursor-pointer"
          >
            <Camera className="w-4 h-4 text-sky-400" />
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-600 text-sky-300 font-mono text-[11px] font-bold">
              C
            </kbd>
          </button>
        </div>

        {/* Right: Driving Speedometer OR Walking On-Foot Telemetry */}
        {mode === 'drive' ? (
          <div
            id="speedometer-telemetry-pill"
            className="pointer-events-auto flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-3 shadow-2xl text-white"
          >
            {/* Speed Gauge Dial */}
            <div className="relative flex flex-col items-center justify-center w-20 h-20 rounded-full bg-slate-950/90 border-2 border-slate-800 shadow-inner">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#1e293b"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeDasharray="213"
                  strokeDashoffset={213 * (1 - speedRatio * 0.75)}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-150"
                />
              </svg>

              <span className="text-xl font-black font-mono tracking-tight leading-none text-white">
                {Math.abs(vehicleSpeed)}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                KM/H
              </span>
              <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold text-sky-400 font-mono">
                <span>{vehicleGear}</span>
                <span className="text-slate-600">•</span>
                <span>{vehicleRpm}</span>
              </div>
            </div>
          </div>
        ) : mode === 'walk' ? (
          <div
            id="walking-telemetry-pill"
            className="pointer-events-auto flex items-center gap-3.5 bg-slate-900/95 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-3 shadow-2xl text-white"
          >
            {/* Walking Speed Dial */}
            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-slate-950/90 border-2 border-amber-500/40">
              <span className="text-lg font-black font-mono tracking-tight leading-none text-amber-400">
                {Math.abs(vehicleSpeed)}
              </span>
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                KM/H
              </span>
            </div>

            {/* Walking Stats (Steps, Distance, Stamina Bar) */}
            <div className="flex flex-col gap-1 min-w-[120px]">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-400 flex items-center gap-1">
                  <Footprints className="w-3.5 h-3.5 text-amber-400" /> Steps:
                </span>
                <span className="font-mono text-white">{walkingSteps}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-400">Distance:</span>
                <span className="font-mono text-sky-400">{walkingDistance}m</span>
              </div>

              {/* Stamina Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-0.5">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-100"
                  style={{ width: `${Math.max(0, Math.min(100, walkingStamina))}%` }}
                />
              </div>
              <div className="text-[8px] text-slate-400 flex justify-between font-mono">
                <span>STAMINA</span>
                <span>{walkingStamina}%</span>
              </div>
            </div>
          </div>
        ) : null}
      </footer>
    </div>
  );
};
