import { getSupabaseClient } from '@/storage/database/supabase-client';

interface SiteSetting {
  key: string;
  value: string;
}

const defaultSettings: Record<string, string> = {
  site_name: '车领驭',
  company_name: '车领驭科技有限公司',
  phone: '400-888-9999',
  email: 'contact@chelingyu.com',
  address: '上海市浦东新区张江高科技园区',
  copyright: '车领驭科技有限公司 版权所有',
};

export async function getSiteSettings(): Promise<Record<string, string>> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('site_settings')
      .select('key, value');
    if (error) throw error;

    const settings: Record<string, string> = { ...defaultSettings };
    if (data) {
      for (const item of data as SiteSetting[]) {
        settings[item.key] = item.value;
      }
    }
    return settings;
  } catch {
    return defaultSettings;
  }
}

export async function updateSiteSetting(key: string, value: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('site_settings')
    .upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
}
