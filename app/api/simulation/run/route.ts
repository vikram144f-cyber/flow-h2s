import { NextResponse } from 'next/server';
import { runSimulation } from '../../../../lib/modules/simulation/generator';

export async function POST(request: Request) {
  try {
    const { commuterCount, seed, strategy, networkScale } = await request.json();

    if (typeof commuterCount !== 'number' || typeof seed !== 'number') {
      return NextResponse.json({ error: 'commuterCount and seed must be numbers' }, { status: 400 });
    }

    if (commuterCount <= 0 || commuterCount > 50000) {
      return NextResponse.json({ error: 'commuterCount must be between 1 and 50000' }, { status: 400 });
    }

    const simStrategy = strategy === 'comparison' ? 'comparison' : 'baseline';
    const scale = networkScale || 'canonical';
    const result = runSimulation(commuterCount, seed, simStrategy, scale);
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
