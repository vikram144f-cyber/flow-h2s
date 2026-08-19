import { SyntheticNetwork, NetworkEdge, TransportMode } from './types';
import { FallbackOption } from '../routing/fallback-scoring';

export interface Path {
  nodes: string[];
  edges: NetworkEdge[];
  totalTime: number;
  totalCostDelta: number;
  minConfidence: number;
  ecoImpact: 'green' | 'neutral' | 'red';
  bottleneckCapacity: number;
}

export function findFastestPath(
  network: SyntheticNetwork,
  origin: string,
  destination: string,
  disruptedEdges: Set<string> = new Set()
): Path | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, { node: string; edge: NetworkEdge }>();
  const unvisited = new Set<string>();

  for (const node of network.nodes.keys()) {
    distances.set(node, Infinity);
    unvisited.add(node);
  }
  distances.set(origin, 0);

  while (unvisited.size > 0) {
    let current = '';
    let minDistance = Infinity;

    for (const node of unvisited) {
      const dist = distances.get(node)!;
      if (dist < minDistance) {
        minDistance = dist;
        current = node;
      }
    }

    if (current === '' || current === destination) break;
    unvisited.delete(current);

    const neighbors = network.edges.filter(
      (e) => e.from === current && !disruptedEdges.has(`${e.from}-${e.to}`)
    );

    for (const edge of neighbors) {
      if (unvisited.has(edge.to)) {
        // Add a 5-minute penalty for transferring between different routes (unless walk)
        const prevRoute = previous.get(current)?.edge.routeId;
        const isTransfer = prevRoute && prevRoute !== edge.routeId && edge.routeId !== 'walk' && prevRoute !== 'walk';
        const transferPenalty = isTransfer ? 5 : 0;
        
        const alt = minDistance + edge.timeMinutes + transferPenalty;
        if (alt < distances.get(edge.to)!) {
          distances.set(edge.to, alt);
          previous.set(edge.to, { node: current, edge });
        }
      }
    }
  }

  if (!previous.has(destination)) return null;

  const nodes: string[] = [];
  const edges: NetworkEdge[] = [];
  let current = destination;
  
  while (current !== origin) {
    nodes.unshift(current);
    const prev = previous.get(current)!;
    edges.unshift(prev.edge);
    current = prev.node;
  }
  nodes.unshift(origin);

  return compilePath(nodes, edges);
}

// Very simple edge-penalizing approach for K alternatives
export function findAlternativePaths(
  network: SyntheticNetwork,
  origin: string,
  destination: string,
  k: number = 3
): Path[] {
  const paths: Path[] = [];
  const penalizedEdges = new Set<string>();

  for (let i = 0; i < k; i++) {
    const path = findFastestPath(network, origin, destination, penalizedEdges);
    if (!path) break;
    paths.push(path);
    
    // Penalize the edges of this path so the next search finds something different
    // We don't penalize 'walk' edges
    for (const edge of path.edges) {
      if (edge.mode !== 'walk') {
        penalizedEdges.add(`${edge.from}-${edge.to}`);
      }
    }
  }

  return paths;
}

function compilePath(nodes: string[], edges: NetworkEdge[]): Path {
  let totalTime = 0;
  let totalCostDelta = 0;
  let minConfidence = 100;
  let hasBus = false;
  let hasMetro = false;
  let bottleneckCapacity = Infinity;

  let prevRoute = '';

  for (const edge of edges) {
    const isTransfer = prevRoute && prevRoute !== edge.routeId && edge.routeId !== 'walk' && prevRoute !== 'walk';
    totalTime += edge.timeMinutes + (isTransfer ? 5 : 0);
    totalCostDelta += edge.costDelta;
    if (edge.confidence < minConfidence) minConfidence = edge.confidence;
    if (edge.capacity < bottleneckCapacity) bottleneckCapacity = edge.capacity;
    
    if (edge.mode === 'bus') hasBus = true;
    if (edge.mode === 'metro') hasMetro = true;
    prevRoute = edge.routeId;
  }

  let ecoImpact: 'green' | 'neutral' | 'red' = 'neutral';
  if (!hasBus && hasMetro) ecoImpact = 'green';
  if (hasBus && !hasMetro) ecoImpact = 'red';

  return {
    nodes,
    edges,
    totalTime,
    totalCostDelta,
    minConfidence,
    ecoImpact,
    bottleneckCapacity
  };
}

export function pathsToFallbacks(paths: Path[]): FallbackOption[] {
  if (paths.length === 0) return [];
  
  // The first path is considered the "baseline" fastest path
  const baselineTime = paths[0].totalTime;

  return paths.map((p, i) => {
    // Generate a readable route name summarizing the modes/lines used
    const routesUsed = new Set(p.edges.filter(e => e.routeId !== 'walk').map(e => e.routeId));
    const routeId = routesUsed.size > 0 ? Array.from(routesUsed).join(' + ') : 'Walking Only';

    return {
      routeId: `${routeId} (Opt ${i + 1})`,
      type: 'MIXED',
      confidence: p.minConfidence,
      timeDelta: p.totalTime - baselineTime, // Path 0 will have timeDelta 0
      costDelta: p.totalCostDelta,
      ecoImpact: p.ecoImpact,
      capacity: p.bottleneckCapacity // We pass capacity along even though FallbackOption type might need it cast
    } as FallbackOption & { capacity: number; pathIndex: number };
  });
}
