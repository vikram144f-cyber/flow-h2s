import { NextResponse } from 'next/server';
import { injectDelayService } from '../../../lib/modules/journey/delay-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { legId, delayMinutes } = body;

    if (!legId || typeof legId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid legId' }, { status: 400 });
    }

    if (typeof delayMinutes !== 'number' || !isFinite(delayMinutes)) {
      return NextResponse.json({ error: 'Missing or invalid delayMinutes' }, { status: 400 });
    }

    const result = await injectDelayService({ legId, delayMinutes });
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message && error.message.includes('Invalid state transition')) {
      return NextResponse.json({ error: error.message }, { status: 409 }); // Conflict
    }
    console.error('Error in /api/inject-delay:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
