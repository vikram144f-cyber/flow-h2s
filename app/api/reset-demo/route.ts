import { NextResponse } from 'next/server';
import { resetDatabaseToDeterministicSeed } from '../../../lib/modules/journey/seed-service';

export async function POST() {
  try {
    const result = await resetDatabaseToDeterministicSeed();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/reset-demo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
