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
      .from('business_services')
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
    
    // Support both single item and batch format { services: [...] }
    const services = body.services || [body];
    
    // Delete all existing services and re-insert
    await client.from('business_services').delete().neq('id', '');
    
    if (services.length > 0) {
      const insertData = services.map((s: Record<string, unknown>, idx: number) => ({
        id: s.id?.toString() || `service_${idx}`,
        title: s.title || s.name || '',
        description: s.description || s.content || '',
        image_url: s.image || s.image_url || '',
        cooperation_mode: s.cooperation_mode || '',
        scenarios: s.scenarios || '',
        category: s.category || 'enterprise',
        is_active: true,
        sort_order: idx,
      }));
      
      const { error } = await client.from('business_services').insert(insertData);
      if (error) {
        console.error('Failed to insert services:', error);
        throw error;
      }
    }
    
    return NextResponse.json({ success: true, count: services.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '创建失败';
    console.error('Services POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('business_services')
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
    const { error } = await client.from('business_services').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
