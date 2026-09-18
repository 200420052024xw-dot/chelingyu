import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Disable caching for API routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const client = getSupabaseClient();
    let query = client
      .from('cases')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
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
    
    // Support both single item and batch format { cases: [...] }
    const cases = body.cases || [body];
    
    // Delete all existing cases and re-insert
    await client.from('cases').delete().neq('id', '');
    
    if (cases.length > 0) {
      const insertData = cases.map((c: Record<string, unknown>, idx: number) => ({
        id: c.id?.toString() || `case_${idx}`,
        title: c.title || '',
        description: c.description || c.content || '',
        category: c.category || 'enterprise',
        images: Array.isArray(c.images) ? c.images : (c.image ? [c.image] : []),
        is_active: true,
        sort_order: idx,
      }));
      
      const { error } = await client.from('cases').insert(insertData);
      if (error) {
        console.error('Failed to insert cases:', error);
        throw error;
      }
    }
    
    return NextResponse.json({ success: true, count: cases.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '创建失败';
    console.error('Cases POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('cases')
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
    const { error } = await client.from('cases').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
