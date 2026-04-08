import { NextResponse } from 'next/server';
import { getAllSubCompanies } from '@/lib/firebase-stores';

// Public endpoint — sub-company list for store finder
export async function GET() {
  try {
    const subCompanies = await getAllSubCompanies();
    return NextResponse.json(subCompanies);
  } catch {
    return NextResponse.json([]);
  }
}
