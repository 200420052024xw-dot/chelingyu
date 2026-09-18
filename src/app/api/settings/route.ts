import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Disable caching for API routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/settings - Get all site settings
export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('site_settings')
      .select('key, value');

    if (error) throw error;

    const settings: Record<string, string> = {};
    if (data) {
      for (const item of data as { key: string; value: string }[]) {
        settings[item.key] = item.value;
      }
    }

    return NextResponse.json({ data: settings }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/settings - Update site settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: '无效的设置数据' }, { status: 400 });
    }

    const client = getSupabaseClient();

    const entries = Object.entries(settings);
    for (const [key, value] of entries) {
      const { error } = await client
        .from('site_settings')
        .upsert({ key, value: String(value) }, { onConflict: 'key' });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '更新失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
