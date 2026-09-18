'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Upload, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface AboutSection {
  id: string;
  type: string;
  title: string;
  content: string;
  image: string;
  sort_order: number;
}

interface UploadStatus {
  sectionId: string;
  type: 'success' | 'error';
  message: string;
}

export function AboutPanel() {
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  // 每个 section 一个独立的 file input 引用
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadCounter, setUploadCounter] = useState(0);

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    if (!uploadStatus) return;
    const timer = setTimeout(() => setUploadStatus(null), 3000);
    return () => clearTimeout(timer);
  }, [uploadStatus]);

  const loadSections = async () => {
    try {
      const t = Date.now();
      const res = await fetch(`/api/about?t=${t}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const sectionKeyToType: Record<string, string> = {
          intro: 'intro',
          certificates: 'certificates',
          advantages: 'advantages',
          team: 'team',
          certificate: 'certificates',
          advantage: 'advantages',
        };
        const transformedSections = data.data.map((item: Record<string, unknown>, idx: number) => {
          const rawKey = (item.section_key as string) || '';
          const type = sectionKeyToType[rawKey] || rawKey || 'custom';
          return {
            id: (item.id as string) || String(idx + 1),
            type,
            title: (item.title as string) || '',
            content: (item.content as string) || '',
            image: Array.isArray(item.images) ? ((item.images as string[])[0] || '') : ((item.image_url as string) || (item.image as string) || ''),
            sort_order: (item.sort_order as number) || idx + 1,
          };
        });
        setSections(transformedSections);
      } else {
        setSections([
          { id: '1', type: 'intro', title: '公司简介', content: '车领驭共享无人车是一家专注于智能无人车研发、销售、租赁及运力服务的高科技企业...', image: '', sort_order: 1 },
          { id: '2', type: 'certificates', title: '企业资质与荣誉', content: '多项国家专利和行业认证', image: '', sort_order: 2 },
          { id: '3', type: 'advantages', title: '核心优势', content: '技术领先、服务完善、经验丰富', image: '', sort_order: 3 },
          { id: '4', type: 'team', title: '团队风采', content: '专业的研发和服务团队', image: '', sort_order: 4 },
        ]);
      }
    } catch {
      setSections([]);
    }
  };

  const handleImageUpload = (sectionId: string) => {
    fileInputRefs.current[sectionId]?.click();
  };

  const handleFileChange = async (sectionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', '关于我们');

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, image: data.url } : s));
        setHasChanges(true);
        setUploadStatus({ sectionId, type: 'success', message: `已上传 ${file.name}` });
      } else {
        setUploadStatus({ sectionId, type: 'error', message: data.error || '上传失败' });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus({ sectionId, type: 'error', message: '上传失败，请重试' });
    } finally {
      setUploadCounter(c => c + 1);
      e.target.value = '';
    }
  };

  const addSection = () => {
    const newSection: AboutSection = {
      id: `about_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'custom',
      title: '新板块',
      content: '板块内容',
      image: '',
      sort_order: sections.length + 1,
    };
    setSections([...sections, newSection]);
    setHasChanges(true);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const apiSections = sections.map((s, idx) => ({
        id: s.id,
        section_key: s.type || `section_${idx}`,
        title: s.title || '',
        content: s.content || '',
        images: s.image ? [s.image] : [],
        sort_order: s.sort_order || idx + 1,
      }));

      const res = await fetch('/api/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: apiSections }),
      });

      if (res.ok) {
        setHasChanges(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const getTypeLabel = (type: string | undefined) => {
    if (!type) return '板块';
    const labels: Record<string, string> = {
      intro: '公司简介',
      certificates: '企业资质',
      advantages: '核心优势',
      team: '团队风采',
      custom: '自定义',
    };
    return labels[type] || type || '板块';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-navy">关于我们管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">管理关于我们页面的各个板块内容</p>
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

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-xl border border-border/50 p-5 shadow-sm">
            {/* 每个 section 独立的 file input */}
            <input
              key={`about-file-${section.id}-${uploadCounter}`}
              ref={(el) => { fileInputRefs.current[section.id] = el; }}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFileChange(section.id, e)}
              className="hidden"
            />

            {uploadStatus && uploadStatus.sectionId === section.id && (
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

            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
                <span className="text-xs font-bold text-navy">{(getTypeLabel(section.type) || '板').charAt(0)}</span>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => { setSections(sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s)); setHasChanges(true); }}
                  className="w-full px-2 py-1 text-sm font-medium rounded border border-transparent hover:border-border focus:border-brand-blue focus:outline-none bg-transparent"
                />
              </div>
              <select
                value={section.type}
                onChange={(e) => { setSections(sections.map(s => s.id === section.id ? { ...s, type: e.target.value } : s)); setHasChanges(true); }}
                className="px-2 py-1 text-xs rounded border border-border bg-white focus:outline-none"
              >
                <option value="intro">公司简介</option>
                <option value="certificates">企业资质</option>
                <option value="advantages">核心优势</option>
                <option value="team">团队风采</option>
                <option value="custom">自定义</option>
              </select>
              <button onClick={() => removeSection(section.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-navy mb-1">板块内容</label>
                <textarea
                  value={section.content}
                  onChange={(e) => { setSections(sections.map(s => s.id === section.id ? { ...s, content: e.target.value } : s)); setHasChanges(true); }}
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy mb-1">板块图片</label>
                <div
                  onClick={() => handleImageUpload(section.id)}
                  className="w-full h-28 border-2 border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-blue/50 hover:bg-brand-blue/5 transition-colors overflow-hidden"
                >
                  {section.image ? (
                    <img src={section.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">点击上传</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addSection}
        className="mt-4 w-full py-3 border-2 border-dashed border-border/60 rounded-xl text-sm text-muted-foreground hover:border-brand-blue/50 hover:text-brand-blue transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> 添加新板块
      </button>
    </div>
  );
}