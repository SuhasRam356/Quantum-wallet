import { NextResponse } from 'next/server';
import { getActivity } from '@/utils/activityStore';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const activities = getActivity(address);
    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Activity fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
