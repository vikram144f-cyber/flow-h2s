import { NextResponse } from 'next/server';
import mockData from '../../../../static-data/mock-gtfs.json';
import { rankFallbacks } from '../../../../lib/modules/routing/fallback-scoring';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Default weights for hackathon
    const wR = parseFloat(searchParams.get('wR') || '0.7');
    const wT = parseFloat(searchParams.get('wT') || '0.15');
    const wC = parseFloat(searchParams.get('wC') || '0.1');
    const wE = parseFloat(searchParams.get('wE') || '0.05');
    
    const journey = mockData.journeys.find(j => j.id === 'mock-aarav-journey');
    if (!journey || !journey.fallbacks) {
      return NextResponse.json({ fallbacks: [] });
    }

    const ranked = rankFallbacks(journey.fallbacks as any, { wR, wT, wC, wE });

    return NextResponse.json({ fallbacks: ranked });
  } catch (error: any) {
    console.error('Error in /api/journey/fallbacks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
