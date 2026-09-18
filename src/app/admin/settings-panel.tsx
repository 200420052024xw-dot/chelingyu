'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, RefreshCw, Upload, X } from 'lucide-react';

interface SettingsData {
  site_name: string;
  company_name: string;
  phone: string;
  email: string;
  address: string;
  copyright: string;
  wechat_qrcode: string;
}

const defaultSettings: SettingsData = {
  site_name: '车领驭',
  company_name: '车领驭科技有限公司',
  phone: '400-888-9999',
  email: 'contact@chelingyu.com',
  address: '上海市浦东新区张江高科技园区',
  copyright: '车领驭科技有限公司 版权所有',
  wechat_qrcode: '',
};

export function SettingsPanel() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const qrcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const t = Date.now();
      const res = await fetch(`/api/settings?t=${t}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.data) {
        setSettings({ ...defaultSettings, ...json.data });
      }
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleQrcodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', '全局设置');
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        const newSettings = { ...settings, wechat_qrcode: data.url };
        setSettings(newSettings);
        // Auto-save to database after upload
        try {
          await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: newSettings }),
          });
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        } catch {
          // silent
        }
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (qrcodeInputRef.current) qrcodeInputRef.current.value = '';
    }
  };

  const fields: { key: keyof SettingsData; label: string; type?: string }[] = [
    { key: 'site_name', label: '网站名称' },
    { key: 'company_name', label: '公司名称' },
    { key: 'phone', label: '联系电话' },
    { key: 'email', label: '电子邮箱' },
    { key: 'address', label: '公司地址' },
    { key: 'copyright', label: '版权信息' },
  ];

  if (loading) {
    return <div className="text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-border/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-navy">全局设置</h3>
          <div className="flex gap-2">
            <button
              onClick={fetchSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border/50 rounded-md hover:bg-surface transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              刷新
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-brand-blue text-white rounded-md hover:bg-brand-blue-light transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? '保存中...' : saved ? '已保存' : '保存设置'}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-navy mb-1.5">{field.label}</label>
              <input
                type={field.type || 'text'}
                value={settings[field.key]}
                onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors"
              />
            </div>
          ))}

          {/* 微信二维码 */}
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">微信二维码</label>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-32 h-32 rounded-md border border-border bg-surface flex items-center justify-center overflow-hidden">
                {settings.wechat_qrcode ? (
                  <img src={settings.wechat_qrcode} alt="微信二维码" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">暂无图片</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => qrcodeInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-navy border border-border/50 rounded-md hover:bg-surface transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? '上传中...' : '上传二维码'}
                </button>
                {settings.wechat_qrcode && (
                  <button
                    type="button"
                    onClick={async () => {
                      const newSettings = { ...settings, wechat_qrcode: '' };
                      setSettings(newSettings);
                      // Auto-save to database after removal
                      try {
                        await fetch('/api/settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ settings: newSettings }),
                        });
                        setSaved(true);
                        setTimeout(() => setSaved(false), 3000);
                      } catch {
                        // silent
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-destructive border border-destructive/30 rounded-md hover:bg-destructive/5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    移除图片
                  </button>
                )}
                <span className="text-xs text-muted-foreground mt-1">建议尺寸：300x300 像素，支持 PNG/JPG 格式</span>
              </div>
            </div>
            <input
              ref={qrcodeInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleQrcodeUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
