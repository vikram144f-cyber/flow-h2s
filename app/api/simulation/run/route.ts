import { NextResponse } from 'next/server';
import { runSimulation } from '../../../../lib/modules/simulation/generator';
import { readJsonObject } from '../../../../lib/http';

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const commuterCount = body?.commuterCount;
    const seed = body?.seed;
    const strategy = body?.strategy;
    const networkScale = body?.networkScale;

    if (
      typeof commuterCount !== 'number' ||
      !Number.isInteger(commuterCount) ||
      typeof seed !== 'number' ||
      !Number.isFinite(seed)
    ) {
      return NextResponse.json({ error: 'commuterCount and seed must be numbers' }, { status: 400 });
    }

    if (commuterCount <= 0 || commuterCount > 50000) {
      return NextResponse.json({ error: 'commuterCount must be between 1 and 50000' }, { status: 400 });
    }

    const simStrategy = strategy === 'comparison' ? 'comparison' : 'baseline';
    const scale = typeof networkScale === 'string' ? networkScale : 'canonical';
    const validScales = ['canonical', 'City Medium', 'City Large', 'City XLarge'];
    if (!validScales.includes(scale)) {
      return NextResponse.json({ error: 'networkScale is invalid' }, { status: 400 });
    }
    const result = runSimulation(commuterCount, seed, simStrategy, scale);
    
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in /api/simulation/run:', error);
    return NextResponse.json({ error: 'Unable to run simulation' }, { status: 500 });
  }
}
