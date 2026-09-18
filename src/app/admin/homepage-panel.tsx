'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Upload, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';

interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  sort_order: number;
}

interface UploadStatus {
  bannerId: string;
  type: 'success' | 'error';
  message: string;
}

export function HomepagePanel() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [brandTitle, setBrandTitle] = useState('车领驭共享无人车');
  const [brandDesc, setBrandDesc] = useState('专注无人车销售、租赁与运力服务');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 用 ref 记录当前正在编辑的 banner id，避免共享 ref 串扰
  const activeBannerIdRef = useRef<string | null>(null);
  const [uploadCounter, setUploadCounter] = useState(0);

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    if (!uploadStatus) return;
    const timer = setTimeout(() => setUploadStatus(null), 3000);
    return () => clearTimeout(timer);
  }, [uploadStatus]);

  const loadBanners = async () => {
    try {
      const t = Date.now();
      const res = await fetch(`/api/banners?t=${t}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const transformed = data.data.map((b: Record<string, unknown>) => ({
          id: (b.id as string) || String(Math.random()),
          title: (b.title as string) || '',
          subtitle: (b.subtitle as string) || '',
          image: (b.image_url as string) || (b.image as string) || '',
          sort_order: (b.sort_order as number) || 0,
        }));
        setBanners(transformed);
      } else {
        setBanners([
          { id: '1', title: '车领驭｜共享无人车', subtitle: '无人货车销售·租赁·运力一体化解决方案', image: '', sort_order: 1 },
          { id: '2', title: '企业运力方案定制', subtitle: '封闭园区/厂区/物流干线无人车解决方案', image: '', sort_order: 2 },
          { id: '3', title: '个人租购体验服务', subtitle: '短租长租灵活选择，智能出行新体验', image: '', sort_order: 3 },
        ]);
      }
    } catch {
      setBanners([
        { id: '1', title: '车领驭｜共享无人车', subtitle: '无人货车销售·租赁·运力一体化解决方案', image: '', sort_order: 1 },
      ]);
    }
  };

  const handleImageUpload = (bannerId: string) => {
    activeBannerIdRef.current = bannerId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const bannerId = activeBannerIdRef.current;
    if (!file || !bannerId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', '首页Banner');

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setBanners(prev => prev.map(b => b.id === bannerId ? { ...b, image: data.url } : b));
        setHasChanges(true);
        setUploadStatus({ bannerId, type: 'success', message: `已上传 ${file.name}` });
      } else {
        setUploadStatus({ bannerId, type: 'error', message: data.error || '上传失败' });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus({ bannerId, type: 'error', message: '上传失败，请重试' });
    } finally {
      setUploadCounter(c => c + 1);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banners }),
      });
      setHasChanges(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const addBanner = () => {
    const newId = Date.now().toString();
    setBanners([...banners, { id: newId, title: '新Banner标题', subtitle: '副标题', image: '', sort_order: banners.length + 1 }]);
    setHasChanges(true);
  };

  const removeBanner = (id: string) => {
    setBanners(banners.filter(b => b.id !== id));
    setHasChanges(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-navy">首页管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">管理首页Banner轮播、品牌展示区内容</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600 font-medium">保存成功</span>}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-medium hover:bg-brand-blue-light transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      {/* 共享的隐藏 file input；通过 key 在每次上传后重置，允许重复上传同一文件 */}
      <input
        key={`banner-file-${uploadCounter}`}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Banner管理 */}
      <div className="bg-white rounded-xl border border-border/50 p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy text-sm">Banner轮播图</h3>
          <button onClick={addBanner} className="flex items-center gap-1.5 text-sm text-brand-blue hover:text-brand-blue-light">
            <Plus className="w-4 h-4" /> 添加Banner
          </button>
        </div>
        <div className="space-y-4">
          {banners.map((banner, index) => (
            <div key={banner.id} className="border border-border/50 rounded-lg p-4">
              {/* 上传状态提示 */}
              {uploadStatus && uploadStatus.bannerId === banner.id && (
                <div
                  className={`mb-3 flex items-center gap-2 px-3 py-2 rounded-md text-xs ${
                    uploadStatus.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {uploadStatus.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  {uploadStatus.message}
                </div>
              )}

              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-medium text-muted-foreground bg-surface px-2 py-1 rounded">Banner {index + 1}</span>
                <button onClick={() => removeBanner(banner.id)} className="ml-auto text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-navy mb-1">主标题</label>
                    <input
                      type="text"
                      value={banner.title}
                      onChange={(e) => { setBanners(banners.map(b => b.id === banner.id ? { ...b, title: e.target.value } : b)); setHasChanges(true); }}
                      className="w-full px-3 py-2 text-sm rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy mb-1">副标题</label>
                    <input
                      type="text"
                      value={banner.subtitle}
                      onChange={(e) => { setBanners(banners.map(b => b.id === banner.id ? { ...b, subtitle: e.target.value } : b)); setHasChanges(true); }}
                      className="w-full px-3 py-2 text-sm rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy mb-1">Banner图片</label>
                  <div
                    onClick={() => handleImageUpload(banner.id)}
                    className="w-full h-28 border-2 border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-blue/50 hover:bg-brand-blue/5 transition-colors bg-surface/50 overflow-hidden"
                  >
                    {banner.image ? (
                      <img src={banner.image} alt="Banner" className="w-full h-full object-cover rounded-md" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground mb-1.5" />
                        <span className="text-xs text-muted-foreground">点击上传图片</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 品牌展示区 */}
      <div className="bg-white rounded-xl border border-border/50 p-5 shadow-sm">
        <h3 className="font-semibold text-navy text-sm mb-4">品牌展示区</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy mb-1">品牌标题</label>
            <input
              type="text"
              value={brandTitle}
              onChange={(e) => { setBrandTitle(e.target.value); setHasChanges(true); }}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy mb-1">品牌描述</label>
            <textarea
              value={brandDesc}
              onChange={(e) => { setBrandDesc(e.target.value); setHasChanges(true); }}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}