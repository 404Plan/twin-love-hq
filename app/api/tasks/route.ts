import { NextResponse } from 'next/server';
import { seedTasks } from '@/lib/seed';

export async function GET() {
  // Placeholder for Supabase database read.
  return NextResponse.json({ tasks: seedTasks });
}
