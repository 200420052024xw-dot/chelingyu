import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (!type || !['enterprise', 'personal'].includes(type)) {
      return NextResponse.json({ error: '无效的表单类型' }, { status: 400 });
    }

    const client = getSupabaseClient();

    const insertData: Record<string, unknown> = {
      type,
      phone: body.phone,
    };

    if (type === 'enterprise') {
      insertData.company_name = body.company_name || '';
      insertData.contact_person = body.contact_person || '';
      insertData.scenario = body.scenario || '';
      insertData.message = body.message || '';
    } else {
      insertData.name = body.name || '';
      insertData.intention = body.intention || '';
      insertData.planned_time = body.planned_time || '';
      insertData.message = body.message || '';
    }

    const { data, error } = await client
      .from('leads')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '提交失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
