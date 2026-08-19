'use client';

import React, { useMemo } from 'react';

interface NetworkGraphProps {
  graphData: any;
  overloadedRoutes?: string[];
}

export default function NetworkGraph({ graphData, overloadedRoutes = [] }: NetworkGraphProps) {
  const { nodes, edges, bounds } = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };

    const nodeList = graphData.nodes instanceof Map ? Array.from(graphData.nodes.values()) : Object.values(graphData.nodes);
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    nodeList.forEach((n: any) => {
      if (n.lon < minX) minX = n.lon;
      if (n.lon > maxX) maxX = n.lon;
      if (n.lat < minY) minY = n.lat;
      if (n.lat > maxY) maxY = n.lat;
    });
    
    // Add some padding
    const padX = (maxX - minX) * 0.1 || 10;
    const padY = (maxY - minY) * 0.1 || 10;
    
    return { 
      nodes: nodeList, 
      edges: graphData.edges, 
      bounds: { 
        minX: minX - padX, 
        maxX: maxX + padX, 
        minY: minY - padY, 
        maxY: maxY + padY 
      } 
    };
  }, [graphData]);

  if (!graphData || nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-lg border border-gray-200 dark:border-gray-700">
        <p>No network graph data available.</p>
      </div>
    );
  }

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative">
      <svg
        viewBox={`${bounds.minX} ${bounds.minY} ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Draw edges first so they are behind nodes */}
        {edges.map((edge: any, idx: number) => {
          const fromNode = nodes.find((n: any) => n.id === edge.from) as any;
          const toNode = nodes.find((n: any) => n.id === edge.to) as any;
          
          if (!fromNode || !toNode) return null;
          
          const isOverloaded = overloadedRoutes.includes(edge.routeId);
          
          let strokeColor = edge.mode === 'metro' ? '#3b82f6' : (edge.mode === 'bus' ? '#64748b' : '#cbd5e1');
          if (isOverloaded) strokeColor = '#ef4444'; // Red if overloaded

          const strokeWidth = edge.mode === 'metro' ? width * 0.008 : (edge.mode === 'bus' ? width * 0.005 : width * 0.002);
          const strokeDasharray = edge.mode === 'walk' ? `${strokeWidth},${strokeWidth*2}` : 'none';

          return (
            <line
              key={`edge-${idx}`}
              x1={fromNode.lon}
              y1={fromNode.lat}
              x2={toNode.lon}
              y2={toNode.lat}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeOpacity={edge.mode === 'walk' ? 0.5 : 0.8}
            />
          );
        })}

        {/* Draw nodes */}
        {nodes.map((node: any) => {
          const isHub = node.type === 'hub' || node.type === 'interchange';
          const r = isHub ? width * 0.015 : width * 0.008;
          const fill = node.type === 'interchange' ? '#f59e0b' : (isHub ? '#10b981' : '#94a3b8');
          
          return (
            <circle
              key={node.id}
              cx={node.lon}
              cy={node.lat}
              r={r}
              fill={fill}
              stroke="#ffffff"
              strokeWidth={width * 0.002}
            >
              <title>{node.name}</title>
            </circle>
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-xs">
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Interchange</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Hub</div>
        <div className="flex items-center gap-2 mb-2"><div className="w-3 h-3 rounded-full bg-slate-400"></div> Stop</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-4 h-1 bg-blue-500"></div> Metro</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-4 h-[2px] bg-slate-500"></div> Bus</div>
        <div className="flex items-center gap-2"><div className="w-4 h-[2px] bg-red-500"></div> Overloaded Route</div>
      </div>
    </div>
  );
}
