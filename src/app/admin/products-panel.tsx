'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  images: string[];
  specs: Record<string, string>;
  b_scenarios: string;
  c_scenarios: string;
}

interface UploadStatus {
  productId: string;
  type: 'success' | 'error';
  message: string;
}

export function ProductsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  // 每个产品一个独立的 file input 引用：避免共享 ref 导致状态串扰
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadCounter, setUploadCounter] = useState(0);

  useEffect(() => {
    loadProducts();
  }, []);

  // 自动隐藏上传状态提示
  useEffect(() => {
    if (!uploadStatus) return;
    const timer = setTimeout(() => setUploadStatus(null), 3000);
    return () => clearTimeout(timer);
  }, [uploadStatus]);

  const loadProducts = async () => {
    try {
      const t = Date.now();
      const res = await fetch(`/api/products?t=${t}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const transformed = data.data.map((p: Record<string, unknown>, idx: number) => ({
          id: (p.id as string) || String(idx + 1),
          name: (p.name as string) || '',
          category: (p.category as string) || '',
          description: (p.description as string) || '',
          images: Array.isArray(p.images) ? (p.images as string[]) : [],
          specs: typeof p.specs === 'object' && p.specs !== null ? (p.specs as Record<string, string>) : {},
          b_scenarios: (p.b_scenarios as string) || '',
          c_scenarios: (p.c_scenarios as string) || '',
        }));
        setProducts(transformed);
      } else {
        setProducts([
          { id: '1', name: '无人货车', category: 'truck', description: '专为物流运输设计的智能无人货车', images: [], specs: { '自动驾驶等级': 'L4', '最大载重': '1000kg', '续航里程': '200km', '最高时速': '60km/h' }, b_scenarios: '园区物流、厂区运输、港口搬运', c_scenarios: '个人大件运输、搬家服务' },
          { id: '2', name: '行驶器无人车', category: 'shuttle', description: '智能出行服务无人车', images: [], specs: { '自动驾驶等级': 'L4', '载客人数': '4-6人', '续航里程': '150km', '最高时速': '40km/h' }, b_scenarios: '园区接驳、景区观光、厂区通勤', c_scenarios: '个人出行体验、短途观光' },
        ]);
      }
    } catch {
      setProducts([]);
    }
  };

  const handleImageUpload = (productId: string) => {
    fileInputRefs.current[productId]?.click();
  };

  const handleFileChange = async (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const product = products.find(p => p.id === productId);
    const category = product?.category === 'truck' ? '产品-无人货车' : '产品-行驶器无人车';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, images: [...p.images, data.url] } : p));
        setHasChanges(true);
        setUploadStatus({ productId, type: 'success', message: `已上传 ${file.name}` });
      } else {
        setUploadStatus({ productId, type: 'error', message: data.error || '上传失败' });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus({ productId, type: 'error', message: '上传失败，请重试' });
    } finally {
      // 通过 key 重置 input，允许重复上传同一文件
      setUploadCounter(c => c + 1);
      e.target.value = '';
    }
  };

  const removeImage = (productId: string, imageIndex: number) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, images: p.images.filter((_, i) => i !== imageIndex) } : p));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });
      setHasChanges(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-navy">产品中心管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">管理产品信息、图片、参数和场景描述</p>
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

      <div className="space-y-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-xl border border-border/50 p-5 shadow-sm">
            {/* 每个产品独立的 file input，通过 key 重置 */}
            <input
              key={`file-${product.id}-${uploadCounter}`}
              ref={(el) => { fileInputRefs.current[product.id] = el; }}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFileChange(product.id, e)}
              className="hidden"
            />

            {/* 上传状态提示 */}
            {uploadStatus && uploadStatus.productId === product.id && (
              <div
                className={`mb-4 flex items-center gap-2 px-4 py-2 rounded-md text-sm ${
                  uploadStatus.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {uploadStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {uploadStatus.message}
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
                <span className="text-sm font-bold text-navy">{product.category === 'truck' ? '货' : '行'}</span>
              </div>
              <div>
                <h3 className="font-semibold text-navy text-sm">{product.name}</h3>
                <p className="text-xs text-muted-foreground">{product.category === 'truck' ? '无人货车产品' : '行驶器无人车产品'}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-navy mb-1">产品名称</label>
                  <input
                    type="text"
                    value={product.name}
                    onChange={(e) => { setProducts(products.map(p => p.id === product.id ? { ...p, name: e.target.value } : p)); setHasChanges(true); }}
                    className="w-full px-3 py-2 text-sm rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy mb-1">产品分类</label>
                  <select
                    value={product.category}
                    onChange={(e) => { setProducts(products.map(p => p.id === product.id ? { ...p, category: e.target.value } : p)); setHasChanges(true); }}
                    className="w-full px-3 py-2 text-sm rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  >
                    <option value="truck">无人货车</option>
                    <option value="shuttle">行驶器无人车</option>
                  </select>
                </div>
              </div>

              {/* 产品描述 */}
              <div>
                <label className="block text-xs font-medium text-navy mb-1">产品描述</label>
                <textarea
                  value={product.description}
                  onChange={(e) => { setProducts(products.map(p => p.id === product.id ? { ...p, description: e.target.value } : p)); setHasChanges(true); }}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue resize-none"
                />
              </div>

              {/* 产品图片 */}
              <div>
                <label className="block text-xs font-medium text-navy mb-2">产品图片（可上传多张）</label>
                <div className="flex flex-wrap gap-3">
                  {product.images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border/50 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(product.id, idx)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  <div
                    onClick={() => handleImageUpload(product.id)}
                    className="w-20 h-20 border-2 border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-blue/50 hover:bg-brand-blue/5 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                    <span className="text-[10px] text-muted-foreground">上传</span>
                  </div>
                </div>
              </div>

              {/* 参数 */}
              <div>
                <label className="block text-xs font-medium text-navy mb-2">产品参数</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">{key}:</span>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                          const newSpecs = { ...product.specs, [key]: e.target.value };
                          setProducts(products.map(p => p.id === product.id ? { ...p, specs: newSpecs } : p));
                          setHasChanges(true);
                        }}
                        className="flex-1 px-2 py-1.5 text-xs rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 场景描述 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-navy mb-1">B端适用场景</label>
                  <textarea
                    value={product.b_scenarios}
                    onChange={(e) => { setProducts(products.map(p => p.id === product.id ? { ...p, b_scenarios: e.target.value } : p)); setHasChanges(true); }}
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy mb-1">C端适用场景</label>
                  <textarea
                    value={product.c_scenarios}
                    onChange={(e) => { setProducts(products.map(p => p.id === product.id ? { ...p, c_scenarios: e.target.value } : p)); setHasChanges(true); }}
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}