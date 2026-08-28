import { NextResponse } from 'next/server';
import mockData from '../../../../static-data/mock-gtfs.json';
import { rankFallbacks } from '../../../../lib/modules/routing/fallback-scoring';

const DEFAULT_WEIGHTS = { wR: 0.7, wT: 0.15, wC: 0.1, wE: 0.05 };

function readWeight(searchParams: URLSearchParams, name: string, fallback: number): number | null {
  const rawValue = searchParams.get(name);
  if (rawValue === null) return fallback;

  const value = Number(rawValue);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const wR = readWeight(searchParams, 'wR', DEFAULT_WEIGHTS.wR);
    const wT = readWeight(searchParams, 'wT', DEFAULT_WEIGHTS.wT);
    const wC = readWeight(searchParams, 'wC', DEFAULT_WEIGHTS.wC);
    const wE = readWeight(searchParams, 'wE', DEFAULT_WEIGHTS.wE);
    if (wR === null || wT === null || wC === null || wE === null) {
      return NextResponse.json({ error: 'Weights must be finite non-negative numbers.' }, { status: 400 });
    }

    if (Math.abs(wR + wT + wC + wE - 1) > 0.001) {
      return NextResponse.json({ error: 'Weights must sum exactly to 1.0.' }, { status: 400 });
    }
    
    const journey = mockData.journeys.find(j => j.id === 'mock-aarav-journey');
    if (!journey || !journey.fallbacks) {
      return NextResponse.json({ fallbacks: [] });
    }

    const ranked = rankFallbacks(journey.fallbacks, { wR, wT, wC, wE });

    return NextResponse.json({ fallbacks: ranked });
  } catch (error: unknown) {
    console.error('Error in /api/journey/fallbacks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
