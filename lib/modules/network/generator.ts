import { NetworkConfig, SyntheticNetwork, NetworkNode, NetworkEdge } from './types';
import { mulberry32 } from '../simulation/prng';

export function generateNetwork(config: NetworkConfig): SyntheticNetwork {
  const { seed, stopCount, hubCount, busRouteCount, metroLineCount } = config;
  const rng = mulberry32(seed);

  const nodes = new Map<string, NetworkNode>();
  const edges: NetworkEdge[] = [];

  // Generate Hubs
  // Hub 0 is Central Hub at (0,0)
  nodes.set('hub-0', {
    id: 'hub-0',
    name: 'Central Hub',
    lat: 0,
    lon: 0,
    type: 'interchange'
  });

  // Place other hubs in a ring around the center
  for (let i = 1; i < hubCount; i++) {
    const angle = (Math.PI * 2 * i) / (hubCount - 1);
    const radius = 5 + rng() * 5; // 5 to 10 units away
    nodes.set(`hub-${i}`, {
      id: `hub-${i}`,
      name: `Hub ${String.fromCharCode(64 + i)}`,
      lat: Math.sin(angle) * radius,
      lon: Math.cos(angle) * radius,
      type: 'hub'
    });
  }

  // Generate Stops
  for (let i = 0; i < stopCount; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 2 + rng() * 15; // 2 to 17 units away
    nodes.set(`stop-${i}`, {
      id: `stop-${i}`,
      name: `Stop ${i + 1}`,
      lat: Math.sin(angle) * radius,
      lon: Math.cos(angle) * radius,
      type: 'stop'
    });
  }

  const nodesList = Array.from(nodes.values());

  // Generate Metro Lines (connecting hubs)
  // Simple approach: each metro line connects a random sequence of hubs
  const hubs = nodesList.filter(n => n.type === 'interchange' || n.type === 'hub');
  for (let m = 0; m < metroLineCount; m++) {
    const routeId = `Metro ${m + 1}`;
    const stopsOnLine = 3 + Math.floor(rng() * 4); // 3 to 6 hubs per line
    
    // Pick random hubs
    const lineStops = [...hubs].sort(() => rng() - 0.5).slice(0, stopsOnLine);
    
    for (let i = 0; i < lineStops.length - 1; i++) {
      const from = lineStops[i];
      const to = lineStops[i + 1];
      const dist = Math.hypot(from.lat - to.lat, from.lon - to.lon);
      const timeMinutes = Math.max(3, Math.round(dist * 1.5));
      
      const edge: NetworkEdge = {
        from: from.id,
        to: to.id,
        routeId,
        mode: 'metro',
        timeMinutes,
        capacity: 1000 + Math.floor(rng() * 1000), // 1000-2000
        costDelta: 2 + Math.floor(rng() * 3),
        ecoImpact: 'green',
        confidence: 90 + Math.floor(rng() * 10) // 90-99
      };
      
      edges.push(edge);
      // Bi-directional
      edges.push({ ...edge, from: to.id, to: from.id });
    }
  }

  // Generate Bus Routes
  // Connect hubs to regular stops and stops to stops
  const regularStops = nodesList.filter(n => n.type === 'stop');
  for (let b = 0; b < busRouteCount; b++) {
    const routeId = `Bus ${b + 1}`;
    const stopsOnLine = 5 + Math.floor(rng() * 8); // 5 to 12 stops per line
    
    // Start at a random hub
    const startHub = hubs[Math.floor(rng() * hubs.length)];
    const lineStops = [startHub];
    
    let current = startHub;
    for (let i = 0; i < stopsOnLine - 1; i++) {
      // Find a close stop not already in the line
      const unvisited = regularStops.filter(s => !lineStops.includes(s));
      if (unvisited.length === 0) break;
      
      // Sort by distance to current
      unvisited.sort((s1, s2) => {
        const d1 = Math.hypot(current.lat - s1.lat, current.lon - s1.lon);
        const d2 = Math.hypot(current.lat - s2.lat, current.lon - s2.lon);
        return d1 - d2;
      });
      
      // Pick one of the closest 3 to add some randomness
      const next = unvisited[Math.floor(rng() * Math.min(3, unvisited.length))];
      lineStops.push(next);
      current = next;
    }
    
    // Create edges
    for (let i = 0; i < lineStops.length - 1; i++) {
      const from = lineStops[i];
      const to = lineStops[i + 1];
      const dist = Math.hypot(from.lat - to.lat, from.lon - to.lon);
      const timeMinutes = Math.max(2, Math.round(dist * 2.5));
      
      const edge: NetworkEdge = {
        from: from.id,
        to: to.id,
        routeId,
        mode: 'bus',
        timeMinutes,
        capacity: 100 + Math.floor(rng() * 100), // 100-200
        costDelta: Math.floor(rng() * 2), // 0-1
        ecoImpact: 'neutral',
        confidence: 70 + Math.floor(rng() * 25) // 70-94
      };
      
      edges.push(edge);
      edges.push({ ...edge, from: to.id, to: from.id });
    }
  }

  // Generate Walk Connections (Transfers between nearby stations)
  // Distance < 3 units
  for (let i = 0; i < nodesList.length; i++) {
    for (let j = i + 1; j < nodesList.length; j++) {
      const n1 = nodesList[i];
      const n2 = nodesList[j];
      const dist = Math.hypot(n1.lat - n2.lat, n1.lon - n2.lon);
      if (dist < 3) {
        const timeMinutes = Math.max(1, Math.round(dist * 5));
        const walkEdge: NetworkEdge = {
          from: n1.id,
          to: n2.id,
          routeId: 'walk',
          mode: 'walk',
          timeMinutes,
          capacity: Infinity,
          costDelta: 0,
          ecoImpact: 'green',
          confidence: 100
        };
        edges.push(walkEdge);
        edges.push({ ...walkEdge, from: n2.id, to: n1.id });
      }
    }
  }

  // The generated transit lines can otherwise leave isolated stops or hubs.
  // Add deterministic walking links to the reachable component so every
  // generated origin/destination pair has a viable fallback path.
  ensureNetworkReachability(nodesList, edges, 'hub-0');

  return { nodes, edges };
}

function ensureNetworkReachability(nodes: NetworkNode[], edges: NetworkEdge[], origin: string): void {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const neighbors = adjacency.get(edge.from) || [];
    neighbors.push(edge.to);
    adjacency.set(edge.from, neighbors);
  }

  const reachable = new Set<string>([origin]);
  const queue = [origin];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adjacency.get(current) || []) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  const originNode = nodes.find((node) => node.id === origin);
  if (!originNode) return;

  for (const node of nodes) {
    if (reachable.has(node.id)) continue;

    const timeMinutes = Math.max(1, Math.round(distance(node, originNode) * 5));
    const walkEdge: NetworkEdge = {
      from: originNode.id,
      to: node.id,
      routeId: 'walk',
      mode: 'walk',
      timeMinutes,
      capacity: Infinity,
      costDelta: 0,
      ecoImpact: 'green',
      confidence: 100
    };
    edges.push(walkEdge, { ...walkEdge, from: node.id, to: originNode.id });
  }
}

function distance(a: NetworkNode, b: NetworkNode): number {
  return Math.hypot(a.lat - b.lat, a.lon - b.lon);
}
