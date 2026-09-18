'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Service {
  id: string;
  title: string;
  type: string;
  description: string;
  image: string;
  features: string[];
  scenarios: string;
}

interface UploadStatus {
  serviceId: string;
  type: 'success' | 'error';
  message: string;
}

export function ServicesPanel() {
  const [services, setServices] = useState<Service[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeServiceIdRef = useRef<string | null>(null);
  const [uploadCounter, setUploadCounter] = useState(0);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (!uploadStatus) return;
    const timer = setTimeout(() => setUploadStatus(null), 3000);
    return () => clearTimeout(timer);
  }, [uploadStatus]);

  const loadServices = async () => {
    try {
      const t = Date.now();
      const res = await fetch(`/api/services?t=${t}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const transformed = data.data.map((s: Record<string, unknown>, idx: number) => ({
          id: (s.id as string) || String(idx + 1),
          title: (s.title as string) || '',
          type: (s.category as string) || 'b',
          description: (s.description as string) || '',
          image: (s.image_url as string) || (s.image as string) || '',
          features: Array.isArray(s.scenarios) ? (s.scenarios as string[]) : [],
          scenarios: (s.scenarios as string) || '',
        }));
        setServices(transformed);
      } else {
        setServices([
          { id: '1', title: '车辆销售', type: 'b', description: '定制化无人货车销售服务', image: '', features: ['按需定制', '终身维护', '技术支持'], scenarios: '园区/厂区/物流' },
          { id: '2', title: '整车租赁', type: 'b', description: '长期整车租赁服务', image: '', features: ['灵活租期', '含维护保养', '24小时响应'], scenarios: '企业长期用车需求' },
          { id: '3', title: '分段租赁', type: 'b', description: '灵活分段租赁服务', image: '', features: ['按天/周/月', '随借随还', '零门槛'], scenarios: '短期项目用车' },
          { id: '4', title: '运力承接', type: 'b', description: '整体运力解决方案', image: '', features: ['运力规划', '车队管理', '数据分析'], scenarios: '大型物流项目' },
          { id: '5', title: '个人短期租赁', type: 'c', description: '个人短期体验租赁', image: '', features: ['日租起', '免押金', '送车上门'], scenarios: '个人体验/短途使用' },
          { id: '6', title: '个人购车', type: 'c', description: '个人整车采购服务', image: '', features: ['分期付款', '定制配色', '售后保障'], scenarios: '个人长期用车' },
        ]);
      }
    } catch {
      setServices([]);
    }
  };

  const handleImageUpload = (serviceId: string) => {
    activeServiceIdRef.current = serviceId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const serviceId = activeServiceIdRef.current;
    if (!file || !serviceId) return;

    const service = services.find(s => s.id === serviceId);
    const category = service?.type === 'b' ? '业务-B端服务' : '业务-C端服务';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setServices(prev => prev.map(s => s.id === serviceId ? { ...s, image: data.url } : s));
        setHasChanges(true);
        setUploadStatus({ serviceId, type: 'success', message: `已上传 ${file.name}` });
      } else {
        setUploadStatus({ serviceId, type: 'error', message: data.error || '上传失败' });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus({ serviceId, type: 'error', message: '上传失败，请重试' });
    } finally {
      setUploadCounter(c => c + 1);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services }),
      });
      setHasChanges(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const bServices = services.filter(s => s.type === 'b');
  const cServices = services.filter(s => s.type === 'c');

  const renderServiceCard = (service: Service) => (
    <div key={service.id} className="border border-border/50 rounded-lg p-4">
      {uploadStatus && uploadStatus.serviceId === service.id && (
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
        <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
          <span className="text-xs font-bold text-brand-blue">{service.type === 'b' ? 'B' : 'C'}</span>
        </div>
        <input
          type="text"
          value={service.title}
          onChange={(e) => { setServices(services.map(s => s.id === service.id ? { ...s, title: e.target.value } : s)); setHasChanges(true); }}
          className="flex-1 px-2 py-1 text-sm font-medium rounded border border-transparent hover:border-border focus:border-brand-blue focus:outline-none bg-transparent"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">服务描述</label>
          <textarea
            value={service.description}
            onChange={(e) => { setServices(services.map(s => s.id === service.id ? { ...s, description: e.target.value } : s)); setHasChanges(true); }}
            rows={2}
            className="w-full px-2 py-1.5 text-xs rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue/20 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">服务图片</label>
          <div
            onClick={() => handleImageUpload(service.id)}
            className="w-full h-16 border border-dashed border-border/60 rounded flex items-center justify-center cursor-pointer hover:border-brand-blue/50 hover:bg-brand-blue/5 transition-colors overflow-hidden"
          >
            {service.image ? (
              <img src={service.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <Upload className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <label className="block text-xs text-muted-foreground mb-1">适用场景</label>
        <input
          type="text"
          value={service.scenarios}
          onChange={(e) => { setServices(services.map(s => s.id === service.id ? { ...s, scenarios: e.target.value } : s)); setHasChanges(true); }}
          className="w-full px-2 py-1.5 text-xs rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue/20"
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-navy">业务服务管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">管理B端企业服务和C端个人服务的图文内容</p>
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

      <input
        key={`service-file-${uploadCounter}`}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* B端服务 */}
      <div className="bg-white rounded-xl border border-border/50 p-5 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-navy/10 flex items-center justify-center">
            <span className="text-xs font-bold text-navy">B</span>
          </div>
          <h3 className="font-semibold text-navy text-sm">企业B端服务专区</h3>
        </div>
        <div className="space-y-4">
          {bServices.map(renderServiceCard)}
        </div>
      </div>

      {/* C端服务 */}
      <div className="bg-white rounded-xl border border-border/50 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-brand-blue/10 flex items-center justify-center">
            <span className="text-xs font-bold text-brand-blue">C</span>
          </div>
          <h3 className="font-semibold text-navy text-sm">个人C端服务专区</h3>
        </div>
        <div className="space-y-4">
          {cServices.map(renderServiceCard)}
        </div>
      </div>
    </div>
  );
}