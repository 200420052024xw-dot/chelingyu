import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Disable caching for API routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('about_sections')
      .select('*')
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
    
    // Support both single item and batch format { sections: [...] }
    const sections = body.sections || [body];
    
    // Delete all existing sections and re-insert
    await client.from('about_sections').delete().neq('id', '');
    
    if (sections.length > 0) {
      const insertData = sections.map((s: Record<string, unknown>, idx: number) => ({
        id: s.id?.toString() || `about_${idx}`,
        section_key: s.section_key || `section_${idx}`,
        title: s.title || '',
        content: s.content || '',
        images: Array.isArray(s.images) ? s.images : (s.image_url ? [s.image_url] : []),
        sort_order: idx,
      }));
      
      const { error } = await client.from('about_sections').insert(insertData);
      if (error) {
        console.error('Failed to insert about sections:', error);
        throw error;
      }
    }
    
    return NextResponse.json({ success: true, count: sections.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '创建失败';
    console.error('About POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('about_sections')
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
    const { error } = await client.from('about_sections').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
