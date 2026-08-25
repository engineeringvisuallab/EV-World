export type EngineeringDiscipline =
  | 'Civil & Structural'
  | 'Transportation & Highways'
  | 'Water Resources & Environmental'
  | 'Geotechnical & Foundations'
  | 'Electrical & Energy'
  | 'Port & Marine Logistics'
  | 'Surveying & Geomatics'
  | 'Urban & Architectural';

export interface EngineeringStructure {
  id: string;
  name: string;
  discipline: EngineeringDiscipline;
  zone: string;
  position: [number, number, number];
  targetLookAt?: [number, number, number];
  summary: string;
  metrics: {
    label: string;
    value: string;
  }[];
  specifications: {
    category: string;
    details: string;
  }[];
  status: 'Operational' | 'Under Construction' | 'Inspection Active' | 'Commissioned';
  progress?: number;
}

export type ExplorationMode = 'drive' | 'walk' | 'drone' | 'orbit';

export type CameraViewMode = 'third_elevated' | 'driver_cockpit' | 'hood_bumper' | 'third_close' | 'top_down';

export type VehicleModelType = 'suv' | 'truck' | 'sport' | 'mixer' | 'heavy_hauler';

export interface VehicleDefinition {
  id: VehicleModelType;
  name: string;
  category: string;
  maxSpeed: number; // km/h
  accelRate: number;
  brakeRate: number;
  turnSpeed: number;
  cockpitHeight: number;
  cockpitForward: number;
  color: string;
}

export interface VehicleState {
  x: number;
  y: number;
  z: number;
  rotation: number;
  speed: number;
  steerAngle: number;
  gear: 'D' | 'R' | 'P';
  rpm: number;
  headlights: boolean;
  vehicleType: VehicleModelType;
}

export interface ZoneInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  position: [number, number, number];
  cameraPos: [number, number, number];
  lookAt: [number, number, number];
}

export interface TrafficBlip {
  x: number;
  z: number;
  type: string;
  color: string;
}
