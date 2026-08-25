import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Navigation,
  MapPin,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { ENGINEERING_STRUCTURES, ENGINEERING_ZONES } from '../data/engineeringData';
import { EngineeringStructure, ZoneInfo, TrafficBlip, ExplorationMode } from '../types';

interface SiteMiniMapProps {
  playerX: number;
  playerZ: number;
  playerRotation?: number;
  trafficList?: TrafficBlip[];
  selectedStructure: EngineeringStructure | null;
  onSelectStructure: (struct: EngineeringStructure | null) => void;
  onTeleportToCoord: (x: number, z: number) => void;
  onTeleportZone: (zone: ZoneInfo) => void;
  mode?: ExplorationMode;
}

export const SiteMiniMap: React.FC<SiteMiniMapProps> = ({
  playerX,
  playerZ,
  playerRotation = 0,
  trafficList = [],
  selectedStructure,
  onSelectStructure,
  onTeleportToCoord,
  onTeleportZone,
  mode = 'drive',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [followPlayer, setFollowPlayer] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 6 km x 6 km Total World Extent (-3000m to +3000m)
  const WORLD_EXTENT = 3000;

  // Convert 3D world coordinate (x, z) to canvas pixel (cx, cy)
  const worldToCanvas = (
    x: number,
    z: number,
    width: number,
    height: number,
    zoom = 1,
    panX = 0,
    panZ = 0
  ) => {
    const scale = (Math.min(width, height) / (WORLD_EXTENT * 2)) * zoom;
    const cx = width / 2 + (x - panX) * scale;
    const cy = height / 2 + (z - panZ) * scale;
    return { cx, cy };
  };

  // Render 6km Realistic Topographic Vector Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const panX = followPlayer ? playerX : 0;
    const panZ = followPlayer ? playerZ : 0;
    const zoom = followPlayer ? Math.max(2, zoomLevel) : zoomLevel;

    // Clear background (Dark topographic terrain)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Coordinate Grid lines (every 500m)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let gx = -WORLD_EXTENT; gx <= WORLD_EXTENT; gx += 500) {
      const pTop = worldToCanvas(gx, -WORLD_EXTENT, width, height, zoom, panX, panZ);
      const pBot = worldToCanvas(gx, WORLD_EXTENT, width, height, zoom, panX, panZ);
      ctx.beginPath();
      ctx.moveTo(pTop.cx, pTop.cy);
      ctx.lineTo(pBot.cx, pBot.cy);
      ctx.stroke();
    }
    for (let gz = -WORLD_EXTENT; gz <= WORLD_EXTENT; gz += 500) {
      const pLeft = worldToCanvas(-WORLD_EXTENT, gz, width, height, zoom, panX, panZ);
      const pRight = worldToCanvas(WORLD_EXTENT, gz, width, height, zoom, panX, panZ);
      ctx.beginPath();
      ctx.moveTo(pLeft.cx, pLeft.cy);
      ctx.lineTo(pRight.cx, pRight.cy);
      ctx.stroke();
    }

    // 1. Northern Mountain Range (Dark Slate Elevation)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    const nm1 = worldToCanvas(-3000, -3000, width, height, zoom, panX, panZ);
    const nm2 = worldToCanvas(3000, -3000, width, height, zoom, panX, panZ);
    const nm3 = worldToCanvas(3000, -600, width, height, zoom, panX, panZ);
    const nm4 = worldToCanvas(-3000, -800, width, height, zoom, panX, panZ);
    ctx.moveTo(nm1.cx, nm1.cy);
    ctx.lineTo(nm2.cx, nm2.cy);
    ctx.lineTo(nm3.cx, nm3.cy);
    ctx.lineTo(nm4.cx, nm4.cy);
    ctx.closePath();
    ctx.fill();

    // 2. Southern Ridge Elevation (cz > 900)
    ctx.fillStyle = '#172554';
    ctx.beginPath();
    const sm1 = worldToCanvas(-3000, 900, width, height, zoom, panX, panZ);
    const sm2 = worldToCanvas(3000, 900, width, height, zoom, panX, panZ);
    const sm3 = worldToCanvas(3000, 3000, width, height, zoom, panX, panZ);
    const sm4 = worldToCanvas(-3000, 3000, width, height, zoom, panX, panZ);
    ctx.moveTo(sm1.cx, sm1.cy);
    ctx.lineTo(sm2.cx, sm2.cy);
    ctx.lineTo(sm3.cx, sm3.cy);
    ctx.lineTo(sm4.cx, sm4.cy);
    ctx.closePath();
    ctx.fill();

    // 3. 6KM Curved River Channel & Canyon
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const riverSteps = 40;
    const leftBank: { cx: number; cy: number }[] = [];
    const rightBank: { cx: number; cy: number }[] = [];

    for (let i = 0; i <= riverSteps; i++) {
      const z = -WORLD_EXTENT + (i / riverSteps) * (WORLD_EXTENT * 2);
      const riverCenter = Math.sin(z * 0.0025) * 160 - 30;
      const ptL = worldToCanvas(riverCenter - 45, z, width, height, zoom, panX, panZ);
      const ptR = worldToCanvas(riverCenter + 45, z, width, height, zoom, panX, panZ);
      leftBank.push(ptL);
      rightBank.push(ptR);
    }

    ctx.moveTo(leftBank[0].cx, leftBank[0].cy);
    for (let i = 1; i < leftBank.length; i++) ctx.lineTo(leftBank[i].cx, leftBank[i].cy);
    for (let i = rightBank.length - 1; i >= 0; i--) ctx.lineTo(rightBank[i].cx, rightBank[i].cy);
    ctx.closePath();
    ctx.fill();

    // Hydro Reservoir (Northern Gorge)
    const damWater = worldToCanvas(-60, -1550, width, height, zoom, panX, panZ);
    ctx.beginPath();
    ctx.arc(damWater.cx, damWater.cy, 14 * zoom, 0, Math.PI * 2);
    ctx.fill();

    // 4. International Airport (4.5km Runway)
    const rwStart = worldToCanvas(-600, 450, width, height, zoom, panX, panZ);
    const rwEnd = worldToCanvas(2000, 450, width, height, zoom, panX, panZ);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4 * Math.max(1, zoom * 0.6);
    ctx.beginPath();
    ctx.moveTo(rwStart.cx, rwStart.cy);
    ctx.lineTo(rwEnd.cx, rwEnd.cy);
    ctx.stroke();

    // 5. High-Speed Rail Viaduct (z = -600)
    const hsrStart = worldToCanvas(-2500, -600, width, height, zoom, panX, panZ);
    const hsrEnd = worldToCanvas(2500, -600, width, height, zoom, panX, panZ);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(hsrStart.cx, hsrStart.cy);
    ctx.lineTo(hsrEnd.cx, hsrEnd.cy);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // 6. 6KM Highway Arterial Grid
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    // East-West Arterial (Z = 70)
    const hwEW1 = worldToCanvas(-2400, 70, width, height, zoom, panX, panZ);
    const hwEW2 = worldToCanvas(2400, 70, width, height, zoom, panX, panZ);
    ctx.beginPath();
    ctx.moveTo(hwEW1.cx, hwEW1.cy);
    ctx.lineTo(hwEW2.cx, hwEW2.cy);
    ctx.stroke();

    // North-South Arterial (X = 100)
    const hwNS1 = worldToCanvas(100, -2200, width, height, zoom, panX, panZ);
    const hwNS2 = worldToCanvas(100, 2200, width, height, zoom, panX, panZ);
    ctx.beginPath();
    ctx.moveTo(hwNS1.cx, hwNS1.cy);
    ctx.lineTo(hwNS2.cx, hwNS2.cy);
    ctx.stroke();

    // 7. Cable-Stayed Bridge Span (Highlight Cyan)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    const bStart = worldToCanvas(-280, 0, width, height, zoom, panX, panZ);
    const bEnd = worldToCanvas(240, 0, width, height, zoom, panX, panZ);
    ctx.beginPath();
    ctx.moveTo(bStart.cx, bStart.cy);
    ctx.lineTo(bEnd.cx, bEnd.cy);
    ctx.stroke();

    // 8. South Coastal Suspension Bridge Span
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    const sbStart = worldToCanvas(-1150, 950, width, height, zoom, panX, panZ);
    const sbEnd = worldToCanvas(-400, 950, width, height, zoom, panX, panZ);
    ctx.beginPath();
    ctx.moveTo(sbStart.cx, sbStart.cy);
    ctx.lineTo(sbEnd.cx, sbEnd.cy);
    ctx.stroke();

    // 8b. Northern Mountain Serpentine Winding Pass (Ascending to Observatory)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const mPts = [
      [-60, -800], [-140, -980], [-220, -1120], [-110, -1280],
      [-60, -1500], [120, -1640], [380, -1760], [620, -1880],
      [880, -1990], [1100, -2100]
    ];
    mPts.forEach(([mx, mz], idx) => {
      const p = worldToCanvas(mx, mz, width, height, zoom, panX, panZ);
      if (idx === 0) ctx.moveTo(p.cx, p.cy);
      else ctx.lineTo(p.cx, p.cy);
    });
    ctx.stroke();

    // 8c. Rural Village Winding Roads & Scenic Pond
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const vPts = [
      [-450, -400], [-580, -480], [-740, -560], [-920, -620],
      [-1100, -580], [-1240, -480], [-1320, -320], [-1220, -180],
      [-1020, -120], [-840, -160], [-680, -260], [-520, -340]
    ];
    vPts.forEach(([vx, vz], idx) => {
      const p = worldToCanvas(vx, vz, width, height, zoom, panX, panZ);
      if (idx === 0) ctx.moveTo(p.cx, p.cy);
      else ctx.lineTo(p.cx, p.cy);
    });
    ctx.closePath();
    ctx.stroke();

    // Village Scenic Pond (Deep Blue circle at -1200, -140)
    const vPond = worldToCanvas(-1200, -140, width, height, zoom, panX, panZ);
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(vPond.cx, vPond.cy, 6 * zoom, 0, Math.PI * 2);
    ctx.fill();

    // 8d. Agricultural Farmland Parcels (Golden Wheat & Green Corn Zones)
    // Golden Wheat Field (x = 1100, z = -600)
    const wheatTopL = worldToCanvas(920, -720, width, height, zoom, panX, panZ);
    const wheatBotR = worldToCanvas(1280, -480, width, height, zoom, panX, panZ);
    ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
    ctx.fillRect(wheatTopL.cx, wheatTopL.cy, wheatBotR.cx - wheatTopL.cx, wheatBotR.cy - wheatTopL.cy);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1;
    ctx.strokeRect(wheatTopL.cx, wheatTopL.cy, wheatBotR.cx - wheatTopL.cx, wheatBotR.cy - wheatTopL.cy);

    // Green Corn Field (x = 1500, z = -750)
    const cornTopL = worldToCanvas(1340, -880, width, height, zoom, panX, panZ);
    const cornBotR = worldToCanvas(1660, -620, width, height, zoom, panX, panZ);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
    ctx.fillRect(cornTopL.cx, cornTopL.cy, cornBotR.cx - cornTopL.cx, cornBotR.cy - cornTopL.cy);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.strokeRect(cornTopL.cx, cornTopL.cy, cornBotR.cx - cornTopL.cx, cornBotR.cy - cornTopL.cy);

    // Farm Country Dirt Roads
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    const fPts = [
      [350, -400], [550, -480], [780, -520], [1050, -490], [1320, -420], [1580, -320]
    ];
    fPts.forEach(([fx, fz], idx) => {
      const p = worldToCanvas(fx, fz, width, height, zoom, panX, panZ);
      if (idx === 0) ctx.moveTo(p.cx, p.cy);
      else ctx.lineTo(p.cx, p.cy);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 9. Live Ambient Traffic Blips
    trafficList.forEach((v) => {
      const pos = worldToCanvas(v.x, v.z, width, height, zoom, panX, panZ);
      ctx.fillStyle = v.color || '#facc15';
      ctx.beginPath();
      ctx.arc(pos.cx, pos.cy, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 10. Engineering Structure Markers across 6km
    ENGINEERING_STRUCTURES.forEach((st) => {
      const isSelected = selectedStructure?.id === st.id;
      const sp = worldToCanvas(st.position[0], st.position[2], width, height, zoom, panX, panZ);

      // Marker Outer Glow
      ctx.beginPath();
      ctx.arc(sp.cx, sp.cy, isSelected ? 7 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? '#38bdf8'
        : st.status === 'Operational'
        ? '#10b981'
        : '#f59e0b';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      if (isExpanded) {
        // Text Label in expanded mode
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px sans-serif';
        ctx.fillText(st.name.slice(0, 24), sp.cx + 8, sp.cy + 3);
      }
    });

    // 11. Player Position & Orientation Blip
    const playerPos = worldToCanvas(playerX, playerZ, width, height, zoom, panX, panZ);

    if (mode === 'walk') {
      // Walking Engineer Indicator (Safety Orange with concentric pulse)
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(playerPos.cx, playerPos.cy, 9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(playerPos.cx, playerPos.cy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Direction cone
      ctx.save();
      ctx.translate(playerPos.cx, playerPos.cy);
      ctx.rotate(playerRotation);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 18, -Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      // Vehicle Driving Pointer (Cyan)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(playerPos.cx, playerPos.cy, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(playerPos.cx, playerPos.cy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Heading Pointer
      ctx.save();
      ctx.translate(playerPos.cx, playerPos.cy);
      ctx.rotate(playerRotation);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(4, 2);
      ctx.lineTo(-4, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }, [playerX, playerZ, playerRotation, trafficList, selectedStructure, isExpanded, zoomLevel, followPlayer, mode]);

  // Handle clicking on map to teleport
  const handleMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const panX = followPlayer ? playerX : 0;
    const panZ = followPlayer ? playerZ : 0;
    const zoom = followPlayer ? Math.max(2, zoomLevel) : zoomLevel;

    const scale = (Math.min(width, height) / (WORLD_EXTENT * 2)) * zoom;
    const targetWorldX = (clickX - width / 2) / scale + panX;
    const targetWorldZ = (clickY - height / 2) / scale + panZ;

    onTeleportToCoord(targetWorldX, targetWorldZ);
  };

  return (
    <div
      id="real-site-minimap-container"
      className={`pointer-events-auto transition-all duration-300 rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden ${
        isExpanded
          ? 'fixed inset-x-6 top-16 bottom-20 z-40 max-w-4xl mx-auto flex flex-col p-4'
          : 'relative w-52 h-52 md:w-60 md:h-60 p-2.5 flex flex-col'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-sky-400 font-semibold">
          <Navigation className="w-3.5 h-3.5" />
          <span>6KM RADAR</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-slate-400">
            {Math.round(playerX)}m, {Math.round(playerZ)}m
          </span>
          <button
            title="Zoom Out"
            onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
            className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            title="Zoom In"
            onClick={() => setZoomLevel((z) => Math.min(4, z + 0.5))}
            className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            id="btn-toggle-minimap-size"
            title={isExpanded ? 'Minimize Radar' : 'Expand 6km Map'}
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2D Vector Radar Canvas */}
      <div className="relative flex-1 w-full h-full min-h-0 flex items-center justify-center my-1">
        <canvas
          ref={canvasRef}
          width={isExpanded ? 760 : 240}
          height={isExpanded ? 540 : 180}
          onClick={handleMapClick}
          className="w-full h-full rounded-xl cursor-crosshair object-contain bg-slate-950 border border-slate-800"
        />

        {/* Live Traffic Badge Overlay */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/60 text-[9px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>6KM GRID</span>
        </div>
      </div>

      {/* Expanded Mode: Quick Zone Grid */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap gap-1.5 overflow-x-auto max-h-24">
          {ENGINEERING_ZONES.map((zone) => (
            <button
              key={zone.id}
              onClick={() => {
                onTeleportZone(zone);
                setIsExpanded(false);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-sky-600/30 border border-slate-700 hover:border-sky-500 text-[11px] text-slate-200 transition"
            >
              <MapPin className="w-3 h-3 text-sky-400" />
              <span>{zone.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
