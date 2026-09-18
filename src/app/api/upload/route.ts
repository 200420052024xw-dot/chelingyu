import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || '其他';

    if (!file) {
      return NextResponse.json({ error: '没有选择文件' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: `不支持的文件格式（${file.type || '未知'}），请使用 JPG / PNG / WebP / MP4` }, { status: 400 });
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过 10MB' }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const filename = `${timestamp}.${ext}`;
    const filepath = join(uploadDir, filename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return the public URL
    const url = `/uploads/${filename}`;
    const id = timestamp.toString();
    const type = file.type.startsWith('video') ? 'video' : 'image';

    // Automatically save to database
    try {
      const client = getSupabaseClient();
      const { error } = await client.from('media_assets').insert({
        id,
        name: file.name,
        type,
        category,
        url,
      });

      if (error) {
        console.error('Failed to save media to database:', error);
        // Still return success since file was uploaded
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Still return success since file was uploaded
    }

    return NextResponse.json({
      id,
      name: file.name,
      type,
      url,
      category,
      saved: true,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
