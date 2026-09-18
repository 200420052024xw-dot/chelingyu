import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Disable caching for API routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('media_assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch media:', error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: data || [] }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Media fetch error:', error);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body as { items: Array<{ id: string; name: string; type: string; category: string; url?: string }> };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: '无效的素材数据' }, { status: 400 });
    }

    const client = getSupabaseClient();

    // Delete all existing media items and re-insert
    await client.from('media_assets').delete().neq('id', '');

    if (items.length > 0) {
      const insertData = items.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        category: item.category,
        url: item.url || '',
      }));

      const { error } = await client.from('media_assets').insert(insertData);

      if (error) {
        console.error('Failed to save media:', error);
        return NextResponse.json({ error: '保存失败' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, count: items.length });
  } catch (error) {
    console.error('Media save error:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
