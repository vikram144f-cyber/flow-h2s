export type TransportMode = 'bus' | 'metro' | 'walk';

export interface NetworkNode {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: 'stop' | 'hub' | 'interchange';
}

export interface NetworkEdge {
  from: string;
  to: string;
  routeId: string;       // "Bus 21", "Blue Line", "walk"
  mode: TransportMode;
  timeMinutes: number;
  capacity: number;
  costDelta: number;
  ecoImpact: string;
  confidence: number;
}

export interface SyntheticNetwork {
  nodes: Map<string, NetworkNode>;
  edges: NetworkEdge[];
}

export interface NetworkConfig {
  seed: number;
  stopCount: number;
  hubCount: number;
  busRouteCount: number;
  metroLineCount: number;
}
