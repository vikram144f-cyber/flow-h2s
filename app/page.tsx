"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { ShieldAlert, CheckCircle2, Zap, Clock, TrendingDown, MapPin, AlertTriangle, ArrowRight, Train, Bus, Activity, RefreshCw } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

/** Formats an ISO timestamp string to a 12-hour AM/PM time using UTC (demo data is UTC). */
function formatTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${String(h % 12 || 12).padStart(2, '0')}:${m} ${ampm}`;
}

export default function CommuterPage() {
  const { data: journey, mutate: mutateJourney } = useSWR('/api/journey', fetcher, {
    refreshInterval: (data) => (data?.status === 'RECOVERED' || data?.status === 'COMPLETED') ? 0 : 2000
  });

  const { data: fallbacksData } = useSWR(
    journey?.status === 'AT_RISK' ? '/api/journey/fallbacks' : null,
    fetcher
  );

  const [isRecovering, setIsRecovering] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedFallbackRouteId, setSelectedFallbackRouteId] = useState<string | null>(null);
  const [disruptionCount, setDisruptionCount] = useState(0);

  // BUG-02: Fetch comparison data whenever RECOVERED so Journey Summary arrival
  // can be derived from the actual API response rather than a hardcoded string.
  // Use journey?.status directly here since the component-level isRecovered/isAtRisk
  // variables are derived later after the loading guard.
  const { data: comparisonData } = useSWR(
    (journey?.status === 'RECOVERED' || showComparison) ? '/api/journey/comparison' : null,
    fetcher
  );

  const handleRecover = async (fallbackId: string) => {
    setIsRecovering(true);
    await fetch('/api/journey/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fallbackRouteId: fallbackId })
    });
    
    mutateJourney();
    setIsRecovering(false);
  };

  const handleDemoDisruption = async () => {
    const nextCount = disruptionCount + 1;
    setDisruptionCount(nextCount);
    // Inject cumulative delays (12 mins, then 24 mins, etc) to ensure confidence continually drops
    await fetch('/api/inject-delay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ legId: 'leg-1', delayMinutes: nextCount * 12 })
    });
    mutateJourney();
  };

  const handleContinueJourney = async () => {
    await fetch('/api/journey/continue', { method: 'POST' });
    // BUG-01: Clear the previous cycle's fallback selection so the next
    // disruption cycle starts with no route pre-selected.
    setSelectedFallbackRouteId(null);
    // Close the comparison modal if open — comparison endpoint requires RECOVERED.
    setShowComparison(false);
    mutateJourney();
  };

  const handleReset = async () => {
    await fetch('/api/reset-demo', { method: 'POST' });
    setShowComparison(false);
    setSelectedFallbackRouteId(null);
    setDisruptionCount(0);
    mutateJourney();
  };

  if (!journey) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center font-sans">
        <div className="animate-pulse w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const isAtRisk = journey.status === 'AT_RISK';
  const isRecovered = journey.status === 'RECOVERED';
  const confidence = journey.currentConfidence;
  
  // Semantic Colors
  let themeColor = 'text-blue-500';
  let ringColor = 'stroke-blue-500';
  let bgTheme = 'bg-[#0B0F19]';
  let badgeTheme = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  let iconColor = 'text-blue-400';

  if (confidence < 85 && confidence >= 50) {
    themeColor = 'text-amber-500';
    ringColor = 'stroke-amber-500';
    badgeTheme = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    iconColor = 'text-amber-400';
  } else if (confidence < 50) {
    themeColor = 'text-red-500';
    ringColor = 'stroke-red-500';
    badgeTheme = 'bg-red-500/20 text-red-400 border-red-500/30';
    iconColor = 'text-red-400';
  }
  
  if (isRecovered) {
    themeColor = 'text-emerald-500';
    ringColor = 'stroke-emerald-500';
    bgTheme = 'bg-[#061B14]'; 
    badgeTheme = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    iconColor = 'text-emerald-400';
  } else if (isAtRisk) {
    bgTheme = 'bg-[#1F1212]';
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-1000 ${bgTheme} flex justify-center p-0 sm:p-8 overflow-hidden relative`}>
      
      {/* Subtle Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      {/* Premium App Shell */}
      <div className="w-full sm:max-w-md relative bg-[#0B0F19]/60 backdrop-blur-3xl sm:border border-white/5 sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-screen sm:h-[850px] max-h-screen">
        
        {/* Top Header */}
        <header className="px-6 pt-8 pb-4 flex justify-between items-center z-10 relative">
          <div>
            <h1 className="text-white font-black text-xl tracking-tight flex items-center">
              FLOW <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-md text-[10px] font-bold tracking-widest uppercase text-gray-400">Live</span>
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAtRisk ? 'bg-red-400' : isRecovered ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAtRisk ? 'bg-red-500' : isRecovered ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
            </span>
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              {isAtRisk ? 'At Risk' : isRecovered ? 'Recovered' : 'Active'}
            </span>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto px-6 pb-40 space-y-6 scrollbar-hide z-10 relative">
          
          {/* Demo Mode Badge */}
          <div className="flex items-start bg-white/5 border border-white/10 rounded-xl p-3">
            <Activity className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Demo Mode</p>
              <p className="text-xs text-gray-300 mt-0.5">Deterministic transit simulation</p>
            </div>
          </div>

          {/* Confidence Hero */}
          <div className={`bg-white/[0.03] rounded-3xl p-6 border transition-colors duration-1000 ${isAtRisk ? 'border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]' : isRecovered ? 'border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]' : 'border-white/5'} text-center relative overflow-hidden flex flex-col items-center justify-center`}>
            
            <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-6">
              {isAtRisk ? 'Status Alert' : isRecovered ? 'Status Update' : 'Connection Confidence'}
            </div>

            <div className="relative w-32 h-32 flex items-center justify-center mb-6">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle 
                  cx="50" cy="50" r="45" fill="none" 
                  className={`transition-all duration-1000 ease-out ${ringColor}`}
                  strokeWidth="8" 
                  strokeDasharray={`${(confidence / 100) * 283} 283`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center">
                <span className={`text-4xl font-black block tracking-tighter ${themeColor}`}>{confidence}%</span>
                {isAtRisk && <span className="text-xs text-gray-500 line-through">100%</span>}
              </div>
            </div>

            <h2 className="text-white font-black text-xl tracking-wide">
              {isAtRisk ? 'Connection At Risk' : isRecovered ? 'Journey Recovered' : 'High Confidence'}
            </h2>
            <p className="text-gray-400 text-sm mt-2 font-medium">
              {isAtRisk ? 'Your transfer is no longer reliable.' : isRecovered ? 'FLOW found a safer path.' : 'Your current route has a 11 min safety margin.'}
            </p>
          </div>

          {/* Journey Summary */}
          <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Destination</p>
              <h3 className="text-white font-bold">{journey.destination}</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Arrival</p>
              {/* BUG-02: Derive arrival from API — comparisonData.flow.finalArrivalTime is
                  route-specific (Route B=08:59, Route C=09:10, Route D=09:03). */}
              <h3 className="text-white font-bold">
                {isRecovered
                  ? (comparisonData?.flow?.finalArrivalTime ?? '...')
                  : '09:05 AM'}
              </h3>
            </div>
          </div>

          {/* Vertical Transit Timeline */}
          <div className="pt-2 pb-6 px-2">
            <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-6 ml-2">Route Timeline</h3>
            
            <div className="relative pl-6 border-l-2 border-white/10 ml-4 space-y-8">
              
              {/* Origin Node */}
              <div className="absolute w-3 h-3 bg-white rounded-full -left-[7px] top-1 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
              <div className="pt-0">
                <h4 className="text-white font-bold text-sm uppercase tracking-wide">Home Station</h4>
                <div className={`mt-3 bg-white/[0.02] border border-white/10 rounded-xl p-3 flex items-center transition-colors ${isAtRisk ? 'border-red-500/30 bg-red-500/5' : ''}`}>
                  <div className={`p-2 rounded-lg mr-3 ${isAtRisk ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                    <Bus className={`w-4 h-4 ${isAtRisk ? 'text-red-400' : 'text-blue-400'}`} />
                  </div>
                  <div className="flex-grow">
                    <p className="text-white font-bold text-sm">Bus 21</p>
                    {/* BUG-03: Use actual leg predictedArrival from the API response.
                        After +12 min injection: predictedArrival = 08:32 AM (not hardcoded 08:43 AM). */}
                    <p className="text-gray-400 text-xs mt-0.5">
                      08:20 AM → {isAtRisk
                        ? <span className="text-red-400 font-bold">{formatTime(journey.legs?.[0]?.predictedArrival)}</span>
                        : '08:31 AM'}
                    </p>
                  </div>
                  {isAtRisk && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
                </div>
              </div>

              {/* Transfer Node */}
              <div className={`absolute w-4 h-4 bg-[#0B0F19] border-2 ${isAtRisk ? 'border-red-500' : isRecovered ? 'border-emerald-500' : 'border-blue-500'} rounded-full -left-[9px] top-[130px] z-10 transition-colors`}></div>
              <div className="pt-2">
                <h4 className="text-white font-bold text-sm uppercase tracking-wide">Transit Hub</h4>
                <p className={`text-xs font-bold mt-1 ${isAtRisk ? 'text-red-400 line-through opacity-70' : isRecovered ? 'text-emerald-400' : 'text-amber-500/80'}`}>
                  {isRecovered ? 'Safe transfer guaranteed' : '4 min transfer buffer'}
                </p>
                
                <div className={`mt-3 bg-white/[0.02] border border-white/10 rounded-xl p-3 flex items-center transition-colors ${isRecovered ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}>
                  <div className={`p-2 rounded-lg mr-3 ${isRecovered ? 'bg-emerald-500/20' : 'bg-gray-700/50'}`}>
                    {isRecovered && journey.selectedRoute?.type === 'BUS' && <Bus className="w-4 h-4 text-emerald-400" />}
                    {isRecovered && journey.selectedRoute?.type === 'TRAIN' && <Train className="w-4 h-4 text-emerald-400" />}
                    {isRecovered && journey.selectedRoute?.type === 'METRO' && <Train className="w-4 h-4 text-emerald-400" />}
                    {!isRecovered && <Train className="w-4 h-4 text-gray-300" />}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{isRecovered ? journey.recoveredRouteId : 'Metro M2'}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {isRecovered 
                        ? `${journey.selectedRoute?.departureTime || '08:47 AM'} → ${journey.selectedRoute?.arrivalTime || '09:09 AM'}` 
                        : '08:35 AM → 09:01 AM'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Destination Node */}
              <div className="absolute w-3 h-3 bg-white rounded-full -left-[7px] bottom-2 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
              <div className="pt-4 pb-2">
                <h4 className="text-white font-bold text-sm uppercase tracking-wide">Campus Station</h4>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Action Area at Bottom (Behind Bottom Sheet if active) */}
        <div className="absolute inset-x-0 bottom-0 p-6 bg-[#0B0F19]/95 border-t border-white/10 backdrop-blur-2xl z-20">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Demo Control</span>
            {!isAtRisk && !isRecovered && <span className="text-xs text-blue-400 font-bold flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-pulse"></span>Ready</span>}
          </div>
          
          {!isAtRisk && !isRecovered && (
            <button onClick={handleDemoDisruption} className="w-full group relative overflow-hidden bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold py-4 rounded-2xl transition-all flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-400 mr-2 group-hover:scale-110 transition-transform" />
              {disruptionCount === 0 ? 'Simulate +12 min Delay' : 'Simulate Another Disruption'}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] duration-1000"></div>
            </button>
          )}

          {(isAtRisk || isRecovered) && (
            <button onClick={handleReset} className="w-full bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-bold py-4 rounded-2xl transition-all flex items-center justify-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Demo
            </button>
          )}
        </div>

        {/* AT RISK: Proactive Alert Bottom Sheet */}
        <div className={`absolute inset-x-0 bottom-0 z-40 transform transition-transform duration-500 ease-out ${isAtRisk && !isRecovered ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="bg-[#0B0F19]/95 backdrop-blur-3xl border-t border-red-500/30 p-6 pt-8 rounded-t-[40px] shadow-[0_-20px_50px_rgba(239,68,68,0.15)] flex flex-col max-h-[85vh]">
            
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-red-500/20 rounded-xl">
                  <AlertTriangle className="text-red-500 w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white tracking-wide">ACTION REQUIRED</h3>
              </div>
            </div>

            <div className="overflow-y-auto flex-grow scrollbar-hide space-y-6 pb-6">
              {journey.explainabilityPayload && (
                <div className="bg-red-500/5 rounded-2xl p-5 border border-red-500/10 space-y-5">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">What Changed</p>
                    <p className="text-sm text-gray-200 font-medium">{journey.explainabilityPayload.whatChanged}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Why It Matters</p>
                    <p className="text-sm text-gray-200 font-medium">{journey.explainabilityPayload.whyItMatters}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Journey Impact</p>
                    <p className="text-sm text-red-400 font-bold">{journey.explainabilityPayload.journeyImpact}</p>
                  </div>
                </div>
              )}

              {fallbacksData?.fallbacks?.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3 ml-1">FLOW Recommendations</p>
                  <div className="space-y-3">
                    {fallbacksData.fallbacks.map((fb: any, idx: number) => {
                      const isSelected = selectedFallbackRouteId === fb.routeId;
                      return (
                      <div 
                        key={fb.routeId} 
                        onClick={() => setSelectedFallbackRouteId(fb.routeId)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-blue-600/10 border-blue-500/50 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'}`}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex flex-col">
                            {idx === 0 && <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">RECOMMENDED</span>}
                            <span className="font-bold text-white text-xl">{fb.routeId}</span>
                          </div>
                          <span className="text-emerald-400 font-black text-xl">{fb.confidence}% <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Safe</span></span>
                        </div>
                        
                        <div className="flex space-x-4 mb-2 text-sm font-bold text-gray-300">
                          <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-gray-400" /> +{fb.timeDelta} min</span>
                          <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5 text-gray-400" /> +{fb.costDelta} USD</span>
                        </div>
                        
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">
                          Fallback Score: {fb.finalScore}
                        </div>
                      </div>
                    )})}
                  </div>
                  
                  {selectedFallbackRouteId && (
                    <button 
                      onClick={() => handleRecover(selectedFallbackRouteId)}
                      disabled={isRecovering}
                      className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/25"
                    >
                      <Zap className="w-5 h-5 fill-current" />
                      <span>{isRecovering ? 'SECURING ROUTE...' : `SWITCH TO ${selectedFallbackRouteId.toUpperCase()}`}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* RECOVERED: Success Overlay */}
        <div className={`absolute inset-x-0 bottom-0 z-40 transform transition-transform duration-700 ease-out ${isRecovered ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="bg-[#0B0F19]/95 backdrop-blur-3xl border-t border-emerald-500/30 p-6 pt-8 rounded-t-[40px] shadow-[0_-20px_50px_rgba(16,185,129,0.15)] flex flex-col">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                <CheckCircle2 className="text-emerald-500 w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white tracking-wide">RECOVERY SUCCESS</h3>
            </div>
            
            <div className="bg-emerald-500/5 rounded-2xl p-5 border border-emerald-500/10 mb-6">
              <p className="text-gray-300 text-sm leading-relaxed font-medium">
                You successfully switched to <strong className="text-emerald-400">{journey.recoveredRouteId}</strong>. 
                The system has proactively secured this alternative route to bypass the detected disruption, ensuring your arrival with {confidence}% confidence.
              </p>
            </div>

            <button 
              onClick={handleContinueJourney}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 mb-3"
            >
              CONTINUE JOURNEY
            </button>

            <button 
              onClick={() => setShowComparison(true)}
              className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/10"
            >
              VIEW FLOW VS FASTEST ROUTE
            </button>
            
            <button 
              onClick={handleReset}
              className="w-full mt-3 bg-transparent text-gray-500 hover:text-gray-300 font-bold py-3 text-xs uppercase tracking-widest transition-colors"
            >
              Reset Demo
            </button>
          </div>
        </div>
      </div>
      
      {/* Post-Journey Comparison Modal (Full Screen Overlay) */}
      {showComparison && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-[#0B0F19]/95 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="w-full max-w-lg bg-[#0B0F19] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-xl font-black text-white tracking-wide uppercase">Simulation Results</h2>
              <button onClick={() => setShowComparison(false)} className="text-gray-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {!comparisonData ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
              ) : (
                <div className="space-y-8">
                  <h3 className="text-2xl font-black text-white text-center leading-tight px-4">
                    FLOW recovered your journey before the connection failed.
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* FLOW Card */}
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex flex-col relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 opacity-10">
                        <CheckCircle2 className="w-24 h-24 text-emerald-500" />
                      </div>
                      <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-4">FLOW Intelligence</h4>
                      <div className="flex items-center text-emerald-400 font-black text-xl mb-6">
                        <CheckCircle2 className="w-6 h-6 mr-2" />
                        {comparisonData.flow.outcome}
                      </div>
                      <div className="space-y-4 mt-auto">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Confidence</p>
                          <p className="text-white font-bold">{comparisonData.flow.confidence}% safe</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Prediction Lead Time</p>
                          <p className="text-white font-bold">{comparisonData.predictionLeadTimeMinutes} minutes early</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Final Delay</p>
                          <p className="text-white font-bold">+{comparisonData.flow.finalDelayMinutes} minutes</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Baseline Card */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex flex-col opacity-80">
                      <h4 className="text-red-400 font-bold uppercase tracking-widest text-[10px] mb-4">Fastest Route Baseline</h4>
                      <div className="flex items-start text-red-400 font-black text-xl mb-6">
                        <AlertTriangle className="w-6 h-6 mr-2 flex-shrink-0" />
                        <span className="leading-tight">{comparisonData.baseline.outcome}</span>
                      </div>
                      <div className="space-y-4 mt-auto">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Outcome</p>
                          <p className="text-white font-bold">Severe disruption</p>
                        </div>
                        <div className="opacity-50">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold line-through">Proactive Recovery</p>
                          <p className="text-white font-bold line-through">None</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Final Delay</p>
                          <p className="text-white font-bold">+{comparisonData.baseline.finalDelayMinutes} minutes</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-black mb-2">Simulated Result</p>
                    <p className="text-sm text-gray-300 leading-relaxed font-medium">
                      {comparisonData.explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
