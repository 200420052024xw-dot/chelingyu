'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Plus, Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface CaseItem {
  id: string;
  title: string;
  type: string;
  description: string;
  images: string[];
  location: string;
  date: string;
}

interface UploadStatus {
  caseId: string;
  type: 'success' | 'error';
  message: string;
}

export function CasesPanel() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  // 每个 case 一个独立的 file input 引用
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadCounter, setUploadCounter] = useState(0);

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    if (!uploadStatus) return;
    const timer = setTimeout(() => setUploadStatus(null), 3000);
    return () => clearTimeout(timer);
  }, [uploadStatus]);

  const loadCases = async () => {
    try {
      const t = Date.now();
      const res = await fetch(`/api/cases?t=${t}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const transformed = data.data.map((c: Record<string, unknown>, idx: number) => ({
          id: (c.id as string) || String(idx + 1),
          title: (c.title as string) || '',
          type: (c.category as string) || '',
          description: (c.description as string) || '',
          images: Array.isArray(c.images) ? (c.images as string[]) : [],
          location: '',
          date: '',
        }));
        setCases(transformed);
      }
    } catch {
      setCases([]);
    }
  };

  const handleImageUpload = (caseId: string) => {
    fileInputRefs.current[caseId]?.click();
  };

  const handleFileChange = async (caseId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const caseItem = cases.find(c => c.id === caseId);
    const category = caseItem?.type === 'enterprise' ? '案例-企业项目' : '案例-个人体验';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setCases(prev => prev.map(c => c.id === caseId ? { ...c, images: [...c.images, data.url] } : c));
        setHasChanges(true);
        setUploadStatus({ caseId, type: 'success', message: `已上传 ${file.name}` });
      } else {
        setUploadStatus({ caseId, type: 'error', message: data.error || '上传失败' });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus({ caseId, type: 'error', message: '上传失败，请重试' });
    } finally {
      setUploadCounter(c => c + 1);
      e.target.value = '';
    }
  };

  const removeImage = (caseId: string, imageIndex: number) => {
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, images: c.images.filter((_, i) => i !== imageIndex) } : c));
    setHasChanges(true);
  };

  const addCase = (type: string) => {
    const newCase: CaseItem = {
      id: `case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: '新案例',
      type,
      description: '案例描述',
      images: [],
      location: '',
      date: new Date().toISOString().split('T')[0],
    };
    setCases([...cases, newCase]);
    setHasChanges(true);
  };

  const removeCase = (id: string) => {
    setCases(cases.filter(c => c.id !== id));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cases }),
      });
      setHasChanges(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const enterpriseCases = cases.filter(c => c.type === 'enterprise');
  const personalCases = cases.filter(c => c.type === 'personal');

  const renderCaseCard = (caseItem: CaseItem) => (
    <div key={caseItem.id} className="border border-border/50 rounded-lg p-4">
      {/* 每个 case 独立的 file input */}
      <input
        key={`case-file-${caseItem.id}-${uploadCounter}`}
        ref={(el) => { fileInputRefs.current[caseItem.id] = el; }}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleFileChange(caseItem.id, e)}
        className="hidden"
      />

      {/* 上传状态提示 */}
      {uploadStatus && uploadStatus.caseId === caseItem.id && (
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
        <input
          type="text"
          value={caseItem.title}
          onChange={(e) => { setCases(cases.map(c => c.id === caseItem.id ? { ...c, title: e.target.value } : c)); setHasChanges(true); }}
          className="flex-1 px-2 py-1 text-sm font-medium rounded border border-transparent hover:border-border focus:border-brand-blue focus:outline-none bg-transparent"
          placeholder="案例名称"
        />
        <button onClick={() => removeCase(caseItem.id)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">案例描述</label>
            <textarea
              value={caseItem.description}
              onChange={(e) => { setCases(cases.map(c => c.id === caseItem.id ? { ...c, description: e.target.value } : c)); setHasChanges(true); }}
              rows={2}
              className="w-full px-2 py-1.5 text-xs rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue/20 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">地点</label>
              <input
                type="text"
                value={caseItem.location}
                onChange={(e) => { setCases(cases.map(c => c.id === caseItem.id ? { ...c, location: e.target.value } : c)); setHasChanges(true); }}
                className="w-full px-2 py-1.5 text-xs rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue/20"
                placeholder="项目地点"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">日期</label>
              <input
                type="date"
                value={caseItem.date}
                onChange={(e) => { setCases(cases.map(c => c.id === caseItem.id ? { ...c, date: e.target.value } : c)); setHasChanges(true); }}
                className="w-full px-2 py-1.5 text-xs rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue/20"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">案例图片</label>
          <div className="flex flex-wrap gap-2">
            {caseItem.images.map((img, idx) => (
              <div key={idx} className="relative w-14 h-14 rounded overflow-hidden border border-border/50 group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(caseItem.id, idx)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            <div
              onClick={() => handleImageUpload(caseItem.id)}
              className="w-14 h-14 border border-dashed border-border/60 rounded flex items-center justify-center cursor-pointer hover:border-brand-blue/50 hover:bg-brand-blue/5 transition-colors"
            >
              <Upload className="w-3 h-3 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-navy">项目案例管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">管理企业项目案例和个人体验案例</p>
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

      {/* 企业案例 */}
      <div className="bg-white rounded-xl border border-border/50 p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy text-sm">企业项目案例</h3>
          <button onClick={() => addCase('enterprise')} className="flex items-center gap-1.5 text-sm text-brand-blue hover:text-brand-blue-light">
            <Plus className="w-4 h-4" /> 添加案例
          </button>
        </div>
        <div className="space-y-4">
          {enterpriseCases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">暂无企业案例，点击上方按钮添加</p>
          ) : (
            enterpriseCases.map(renderCaseCard)
          )}
        </div>
      </div>

      {/* 个人案例 */}
      <div className="bg-white rounded-xl border border-border/50 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy text-sm">个人体验案例</h3>
          <button onClick={() => addCase('personal')} className="flex items-center gap-1.5 text-sm text-brand-blue hover:text-brand-blue-light">
            <Plus className="w-4 h-4" /> 添加案例
          </button>
        </div>
        <div className="space-y-4">
          {personalCases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">暂无个人案例，点击上方按钮添加</p>
          ) : (
            personalCases.map(renderCaseCard)
          )}
        </div>
      </div>
    </div>
  );
}