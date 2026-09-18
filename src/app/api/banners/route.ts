import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Disable caching for API routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: data || [] }, {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();
    
    // Support both single item and batch format { banners: [...] }
    const banners = body.banners || [body];
    
    // Delete all existing banners and re-insert
    await client.from('banners').delete().neq('id', '');
    
    if (banners.length > 0) {
      const insertData = banners.map((b: Record<string, unknown>, idx: number) => ({
        id: b.id?.toString() || `banner_${idx}`,
        title: b.title || '',
        subtitle: b.subtitle || b.content || '',
        image_url: b.image || b.image_url || '',
        is_active: true,
        sort_order: idx,
      }));
      
      const { error } = await client.from('banners').insert(insertData);
      if (error) throw error;
    }
    
    return NextResponse.json({ success: true, count: banners.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '创建失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('banners')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '更新失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 });

    const client = getSupabaseClient();
    const { error } = await client.from('banners').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
