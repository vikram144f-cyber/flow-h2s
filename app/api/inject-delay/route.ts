import { NextResponse } from 'next/server';
import { injectDelayService } from '../../../lib/modules/journey/delay-service';
import { hasErrorMessage, readJsonObject } from '../../../lib/http';

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const legId = body?.legId;
    const delayMinutes = body?.delayMinutes;

    if (!legId || typeof legId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid legId' }, { status: 400 });
    }

    if (typeof delayMinutes !== 'number' || !Number.isFinite(delayMinutes)) {
      return NextResponse.json({ error: 'Missing or invalid delayMinutes' }, { status: 400 });
    }

    const result = await injectDelayService({ legId, delayMinutes });
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (hasErrorMessage(error, 'not found')) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Requested resource not found' }, { status: 404 });
    }
    if (hasErrorMessage(error, 'Invalid state transition')) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid state transition' }, { status: 409 }); // Conflict
    }
    console.error('Error in /api/inject-delay:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
