"use client";

import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Zap, TrendingUp, TrendingDown, Users, Server, Maximize2, Minimize2, AlertTriangle, CheckCircle2, Play, Info } from 'lucide-react';
import NetworkGraph from './NetworkGraph';

export default function OperatorDashboard() {
  const [commuterCount, setCommuterCount] = useState<number>(1000);
  const [seed, setSeed] = useState<number>(42);
  const [networkScale, setNetworkScale] = useState<string>('canonical');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'baseline' | 'flow'>('flow');
  const [presentationMode, setPresentationMode] = useState<boolean>(false);

  const runSimulation = async (count: number, s: number, scale: string = networkScale) => {
    setIsRunning(true);
    setSimulationData(null);
    const startTime = performance.now();
    try {
      const res = await fetch('/api/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commuterCount: count, seed: s, strategy: 'comparison', networkScale: scale })
      });
      const data = await res.json();
      setSimulationData(data);
    } catch (e) {
      console.error(e);
    } finally {
      const endTime = performance.now();
      setExecutionTime(Number((endTime - startTime).toFixed(1)));
      setIsRunning(false);
      setViewMode('flow');
    }
  };

  const handleDemoMode = () => {
    setCommuterCount(1000);
    setSeed(42);
    runSimulation(1000, 42);
  };

  const activeData = simulationData ? simulationData[viewMode] : null;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-1000 bg-[#0B0F19] text-white overflow-hidden relative ${presentationMode ? 'p-0' : 'p-4 sm:p-8'}`}>
      
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <div className={`max-w-7xl mx-auto flex flex-col h-full relative z-10 ${presentationMode ? 'h-screen p-8' : ''}`}>
        
        {/* TOP HEADER */}
        <header className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-black tracking-widest uppercase">FLOW Network Intelligence</h1>
              <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-md text-[10px] font-bold text-blue-400 uppercase tracking-widest animate-pulse flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></span> Simulation Active
              </span>
              <span className="px-2 py-1 bg-white/10 rounded-md text-[10px] font-bold text-gray-400 uppercase tracking-widest border border-white/10">
                SIMULATED RESULT
              </span>
            </div>
            {simulationData && !simulationData.error && typeof simulationData.totalCommuters === 'number' && (
              <div className="flex items-center text-sm font-bold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 inline-flex">
                <AlertTriangle className="w-4 h-4 mr-2" />
                CENTRAL HUB DISRUPTION: {simulationData.totalCommuters.toLocaleString()} commuters affected
              </div>
            )}
            {simulationData && simulationData.error && (
              <div className="flex items-center text-sm font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 inline-flex mt-2">
                <AlertTriangle className="w-4 h-4 mr-2" />
                ERROR: {simulationData.error}
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setPresentationMode(!presentationMode)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            {presentationMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </header>

        {/* CONTROLS (Hidden in Presentation Mode) */}
        {!presentationMode && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 flex flex-wrap gap-6 items-end">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">Commuters</label>
              <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                {[100, 1000, 5000].map(c => (
                  <button 
                    key={c}
                    onClick={() => setCommuterCount(c)}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${commuterCount === c ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    {c.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">Seed</label>
              <input 
                type="number" 
                value={seed} 
                onChange={(e) => setSeed(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-bold text-white w-24 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button 
              onClick={() => runSimulation(commuterCount, seed)}
              disabled={isRunning}
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center h-10 border border-white/10 disabled:opacity-50"
            >
              <Play className="w-4 h-4 mr-2" />
              RUN SIMULATION
            </button>
            <div className="flex-grow"></div>
            <div className="border-l border-white/10 pl-6 flex items-center space-x-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">Demo Network</label>
                <select 
                  value={networkScale}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNetworkScale(val);
                    setCommuterCount(val === 'canonical' ? 1000 : 5000);
                  }}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-500 h-10 appearance-none"
                >
                  <option value="canonical">Small Demo (3 Routes)</option>
                  <option value="City Medium">City Medium (100 Stops)</option>
                  <option value="City Large">City Large (250 Stops)</option>
                  <option value="City XLarge">City XLarge (500 Stops)</option>
                </select>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">Preset</p>
                <button 
                  onClick={() => {
                    const cCount = networkScale === 'canonical' ? 1000 : 5000;
                    setCommuterCount(cCount);
                    setSeed(42);
                    runSimulation(cCount, 42, networkScale);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black py-2 px-6 rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95 h-10"
                >
                  RUN {networkScale === 'canonical' ? '1K CANONICAL' : '5K CITY'}
                </button>
              </div>
            </div>
            {executionTime !== null && (
              <div className="text-[10px] text-gray-500 uppercase font-bold self-center">
                Executed in {executionTime}ms
              </div>
            )}
          </div>
        )}

        {/* LOADING STATE */}
        {isRunning && (
          <div className="flex-grow flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest animate-pulse">Running Simulation...</p>
            </div>
          </div>
        )}

        {/* DASHBOARD CONTENT */}
        {!isRunning && simulationData && !simulationData.error && activeData && (
          <div className="flex-grow flex flex-col gap-6">
            
            {/* TOGGLE & HERO ROW */}
            <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <div className="flex items-center bg-[#0B0F19] rounded-xl p-1.5 border border-white/10 z-10 shadow-2xl relative">
                <div className={`absolute inset-y-1.5 w-[140px] rounded-lg transition-transform duration-500 ease-in-out ${viewMode === 'baseline' ? 'translate-x-1.5 bg-gray-800' : 'translate-x-[148px] bg-blue-600'}`}></div>
                <button 
                  onClick={() => setViewMode('baseline')}
                  className={`relative w-[140px] py-3 text-sm font-black uppercase tracking-widest rounded-lg transition-colors z-20 ${viewMode === 'baseline' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Baseline
                </button>
                <button 
                  onClick={() => setViewMode('flow')}
                  className={`relative w-[140px] py-3 text-sm font-black uppercase tracking-widest rounded-lg transition-colors z-20 ${viewMode === 'flow' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  FLOW
                </button>
              </div>

              <div className="flex flex-col items-end z-10">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Network Journey Success</span>
                <div className="flex items-baseline space-x-6">
                  {viewMode === 'flow' && (
                    <div className="flex items-center text-emerald-400 font-black text-2xl mr-4 animate-in slide-in-from-left duration-500">
                      <TrendingUp className="w-6 h-6 mr-2" />
                      +{simulationData.improvement.successRateImprovement} pts
                    </div>
                  )}
                  <span className={`text-6xl font-black tracking-tighter transition-colors duration-1000 ${viewMode === 'baseline' ? 'text-red-500' : 'text-emerald-500'}`}>
                    {activeData.successRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
              
              {/* LEFT: SVG NETWORK MAP */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col relative overflow-hidden group">
                <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-6 z-10 relative">Network Topology</h3>
                <div className="flex-grow flex items-center justify-center relative">
                  {networkScale !== 'canonical' && simulationData.networkGraph ? (
                    <NetworkGraph 
                      graphData={simulationData.networkGraph} 
                      overloadedRoutes={activeData.overloadedRoutes} 
                    />
                  ) : (
                    <svg className="w-full h-full max-h-[400px]" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet">
                      {/* Disruption Node */}
                      <circle cx="150" cy="50" r="16" className="fill-[#0B0F19] stroke-red-500 stroke-2" />
                      <AlertTriangle x="142" y="42" width="16" height="16" className="text-red-500" />
                      <text x="150" y="80" textAnchor="middle" className="text-[10px] fill-white font-bold uppercase tracking-widest">Central Hub</text>
                      
                      {/* Paths */}
                      <path d="M 150 100 L 150 150 L 50 150 L 50 250" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                      <path d="M 150 100 L 150 250" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                      <path d="M 150 100 L 150 150 L 250 150 L 250 250" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />

                      {/* Active Flows (Animated Dots) */}
                      <path id="pathB" d="M 150 100 L 150 150 L 50 150 L 50 250" fill="none" stroke="transparent" strokeWidth="4" />
                      <path id="pathC" d="M 150 100 L 150 250" fill="none" stroke="transparent" strokeWidth="4" />
                      <path id="pathD" d="M 150 100 L 150 150 L 250 150 L 250 250" fill="none" stroke="transparent" strokeWidth="4" />
                      
                      {/* Animated commuters for Route B */}
                      {activeData.routeLoads[0].assignedCount > 0 && (
                        <circle r="4" className={`fill-current ${viewMode === 'baseline' ? 'text-red-500' : 'text-blue-500'}`}>
                          <animateMotion dur="2s" repeatCount="indefinite" path="M 150 100 L 150 150 L 50 150 L 50 250" />
                        </circle>
                      )}
                      {/* Animated commuters for Route C */}
                      {activeData.routeLoads[1].assignedCount > 0 && (
                        <circle r="4" className="fill-emerald-500">
                          <animateMotion dur="2s" repeatCount="indefinite" begin="0.5s" path="M 150 100 L 150 250" />
                        </circle>
                      )}
                      
                      {/* Nodes B, C, D */}
                      <g transform="translate(50, 270)">
                        <circle cx="0" cy="0" r="12" className={`fill-[#0B0F19] stroke-2 ${viewMode === 'baseline' ? 'stroke-red-500' : 'stroke-blue-500'}`} />
                        <text x="0" y="4" textAnchor="middle" className="text-[10px] fill-white font-bold">B</text>
                        <text x="0" y="24" textAnchor="middle" className="text-[8px] fill-gray-400 font-bold uppercase">{activeData.routeLoads[0].assignedCount} riders</text>
                      </g>
                      <g transform="translate(150, 270)">
                        <circle cx="0" cy="0" r="12" className={`fill-[#0B0F19] stroke-2 ${viewMode === 'flow' && activeData.routeLoads[1].assignedCount > 0 ? 'stroke-emerald-500' : 'stroke-gray-700'}`} />
                        <text x="0" y="4" textAnchor="middle" className="text-[10px] fill-white font-bold">C</text>
                        <text x="0" y="24" textAnchor="middle" className="text-[8px] fill-gray-400 font-bold uppercase">{activeData.routeLoads[1].assignedCount} riders</text>
                      </g>
                      <g transform="translate(250, 270)">
                        <circle cx="0" cy="0" r="12" className="fill-[#0B0F19] stroke-gray-700 stroke-2" />
                        <text x="0" y="4" textAnchor="middle" className="text-[10px] fill-white font-bold">D</text>
                        <text x="0" y="24" textAnchor="middle" className="text-[8px] fill-gray-400 font-bold uppercase">{activeData.routeLoads[2].assignedCount} riders</text>
                      </g>
                    </svg>
                  )}
                </div>
              </div>

              {/* MIDDLE: METRICS & EXPLAINABILITY */}
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Successful</p>
                    <p className={`text-3xl font-black ${viewMode === 'baseline' ? 'text-red-400' : 'text-emerald-400'}`}>{activeData.successfulJourneys.toLocaleString()} <span className="text-sm font-bold text-gray-600">/ {simulationData.totalCommuters.toLocaleString()}</span></p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 flex items-center"><ShieldAlert className="w-3 h-3 mr-1" /> Failed</p>
                    <p className={`text-3xl font-black ${viewMode === 'baseline' ? 'text-red-500' : 'text-gray-400'}`}>{activeData.failedJourneys.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 flex items-center"><Activity className="w-3 h-3 mr-1" /> Peak Route Util.</p>
                    <p className={`text-3xl font-black ${activeData.maxUtilization > 100 ? 'text-red-500' : 'text-emerald-400'}`}>{activeData.maxUtilization}%</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 flex items-center"><Server className="w-3 h-3 mr-1" /> Bottleneck</p>
                    <p className={`text-xl font-black uppercase tracking-widest ${activeData.overloadedRoutes.length > 0 ? 'text-red-500' : 'text-emerald-400'}`}>{activeData.overloadedRoutes.length > 0 ? 'Critical' : 'Contained'}</p>
                  </div>
                </div>

                {viewMode === 'flow' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex-grow flex flex-col justify-center animate-in fade-in duration-500">
                    <h3 className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-4 flex items-center"><Info className="w-4 h-4 mr-2" /> Why FLOW Worked</h3>
                    <div className="space-y-4 text-sm font-medium text-emerald-100/80 leading-relaxed">
                      <p>Conventional fastest-route routing sent all {simulationData.totalCommuters.toLocaleString()} commuters toward Route B.</p>
                      <p className="text-emerald-400">FLOW evaluated individual commuter preferences and route capacity in real-time.</p>
                      <p>Once Route B reached capacity, FLOW redirected remaining commuters toward the next highest-scoring viable route.</p>
                      <p className="text-white font-bold bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/30">Result: {simulationData.improvement.failedJourneyReduction.toLocaleString()} commuters avoided the secondary bottleneck.</p>
                    </div>
                  </div>
                )}
                {viewMode === 'baseline' && (
                  <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-6 flex-grow flex flex-col justify-center animate-in fade-in duration-500">
                    <h3 className="text-[10px] text-red-500 uppercase tracking-widest font-bold mb-4 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> Baseline Failure</h3>
                    <div className="space-y-4 text-sm font-medium text-red-200/80 leading-relaxed">
                      <p>Conventional routing engines ignore capacity.</p>
                      <p>By routing everyone on the mathematical shortest path, the system created a massive secondary bottleneck on Route B.</p>
                      <p className="text-white font-bold bg-red-500/20 p-2 rounded-lg border border-red-500/30">Result: {activeData.failedJourneys.toLocaleString()} stranded commuters.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: SECONDARY BOTTLENECK VISUALIZATION & EXPLORER */}
              <div className="flex flex-col gap-6">
                
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-6">Route Load vs Capacity</h3>
                  <div className="space-y-6">
                    {activeData.routeLoads.map((r: any) => {
                      const cappedUtil = Math.min(r.utilizationPercentage, 100);
                      const overloadUtil = Math.max(0, r.utilizationPercentage - 100);
                      
                      return (
                        <div key={r.routeId}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-white text-sm">{r.routeId}</span>
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${r.isOverloaded ? 'text-red-500' : r.utilizationPercentage === 100 ? 'text-blue-400' : 'text-gray-500'}`}>
                              {r.isOverloaded ? `${r.utilizationPercentage}% / CRITICAL` : r.utilizationPercentage === 100 ? '100% / FULL' : `${r.utilizationPercentage}%`}
                            </span>
                          </div>
                          
                          <div className="h-4 bg-gray-900 rounded-full overflow-hidden flex relative">
                            {/* Base Capacity Bar */}
                            <div 
                              className={`h-full transition-all duration-1000 ease-out ${r.isOverloaded ? 'bg-red-600' : viewMode === 'flow' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${cappedUtil}%` }}
                            />
                            {/* Overload Extension Bar (only visible if overloaded) */}
                            {r.isOverloaded && (
                              <div 
                                className="h-full bg-red-500 opacity-50 transition-all duration-1000 ease-out animate-pulse"
                                style={{ width: `${Math.min(overloadUtil, 100)}%` }} // Visual cap for the bar itself, though text shows true %
                              />
                            )}
                            
                            {/* Capacity Marker */}
                            {r.isOverloaded && (
                              <div className="absolute top-0 bottom-0 left-[100%] border-l-2 border-white z-10" />
                            )}
                          </div>
                          <div className="flex justify-between mt-1 opacity-50">
                            <span className="text-[8px] text-white">0</span>
                            <span className="text-[8px] text-white">Cap: {r.capacity}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex-grow flex flex-col overflow-hidden">
                  <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-4">Inspect FLOW Decisions</h3>
                  <div className="overflow-y-auto pr-2 space-y-3 flex-grow max-h-[300px] scrollbar-hide">
                    {simulationData.examples.map((ex: any, idx: number) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <Users className="w-3 h-3 text-blue-400" />
                          <span className="text-xs font-bold text-white">{ex.commuterId}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                          {ex.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
