'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit2, FileText, Image, Truck, Briefcase, Users, FolderOpen } from 'lucide-react';

interface ContentSection {
  id: string;
  section_key: string;
  title: string;
  content: string;
  image_url?: string;
  page: string; // home, products, services, cases, about
}

const PAGE_OPTIONS = [
  { id: 'home', label: '首页', icon: FileText },
  { id: 'products', label: '产品中心', icon: Truck },
  { id: 'services', label: '业务服务', icon: Briefcase },
  { id: 'cases', label: '项目案例', icon: FolderOpen },
  { id: 'about', label: '关于我们', icon: Users },
];

export default function ContentPanel() {
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editPage, setEditPage] = useState('home');
  const [activePage, setActivePage] = useState('home');

  useEffect(() => {
    fetchSections();
  }, [activePage]);

  const fetchSections = async () => {
    try {
      // Fetch from all relevant APIs based on page
      const apis: Record<string, string> = {
        home: '/api/banners',
        products: '/api/products',
        services: '/api/services',
        cases: '/api/cases',
        about: '/api/about',
      };
      const res = await fetch(apis[activePage] || '/api/about');
      const data = await res.json();
      // Transform the data to ContentSection format
      const items = (data.data || []).map((item: Record<string, unknown>, idx: number) => ({
        id: item.id?.toString() || idx.toString(),
        section_key: item.section_key || item.slug || `item_${idx}`,
        title: item.title || item.name || '',
        content: item.description || item.content || item.intro || '',
        image_url: item.image_url || (Array.isArray(item.images) ? item.images[0] : '') || '',
        page: activePage,
      }));
      setSections(items);
    } catch (error) {
      console.error('Failed to fetch sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSection = () => {
    const newSection: ContentSection = {
      id: Date.now().toString(),
      section_key: `section_${Date.now()}`,
      title: '新板块',
      content: '',
      image_url: '',
      page: activePage,
    };
    setSections([...sections, newSection]);
    startEdit(newSection);
  };

  const startEdit = (section: ContentSection) => {
    setEditingId(section.id);
    setEditTitle(section.title);
    setEditContent(section.content);
    setEditImage(section.image_url || '');
    setEditPage(section.page);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const updatedSections = sections.map((s) =>
      s.id === editingId
        ? { ...s, title: editTitle, content: editContent, image_url: editImage, page: editPage }
        : s
    );
    setSections(updatedSections);
    setEditingId(null);

    // Save to the correct API based on page
    try {
      const apis: Record<string, string> = {
        home: '/api/banners',
        products: '/api/products',
        services: '/api/services',
        cases: '/api/cases',
        about: '/api/about',
      };
      const api = apis[activePage] || '/api/about';
      
      // Transform sections back to the format expected by each API
      let body: Record<string, unknown> = {};
      if (activePage === 'home') {
        body = { banners: updatedSections.map(s => ({ id: s.id, title: s.title, subtitle: s.content, image: s.image_url })) };
      } else if (activePage === 'products') {
        body = { products: updatedSections.map(s => ({ id: s.id, name: s.title, description: s.content, images: s.image_url ? [s.image_url] : [] })) };
      } else if (activePage === 'services') {
        body = { services: updatedSections.map(s => ({ id: s.id, name: s.title, description: s.content, image: s.image_url })) };
      } else if (activePage === 'cases') {
        body = { cases: updatedSections.map(s => ({ id: s.id, title: s.title, description: s.content, images: s.image_url ? [s.image_url] : [] })) };
      } else {
        body = { sections: updatedSections.map(s => ({ id: s.id, section_key: s.section_key, title: s.title, content: s.content, image_url: s.image_url })) };
      }
      
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const deleteSection = async (id: string) => {
    const updatedSections = sections.filter((s) => s.id !== id);
    setSections(updatedSections);

    try {
      const apis: Record<string, string> = {
        home: '/api/banners',
        products: '/api/products',
        services: '/api/services',
        cases: '/api/cases',
        about: '/api/about',
      };
      const api = apis[activePage] || '/api/about';
      
      let body: Record<string, unknown> = {};
      if (activePage === 'home') {
        body = { banners: updatedSections.map(s => ({ id: s.id, title: s.title, subtitle: s.content, image: s.image_url })) };
      } else if (activePage === 'products') {
        body = { products: updatedSections.map(s => ({ id: s.id, name: s.title, description: s.content, images: s.image_url ? [s.image_url] : [] })) };
      } else if (activePage === 'services') {
        body = { services: updatedSections.map(s => ({ id: s.id, name: s.title, description: s.content, image: s.image_url })) };
      } else if (activePage === 'cases') {
        body = { cases: updatedSections.map(s => ({ id: s.id, title: s.title, description: s.content, images: s.image_url ? [s.image_url] : [] })) };
      } else {
        body = { sections: updatedSections.map(s => ({ id: s.id, section_key: s.section_key, title: s.title, content: s.content, image_url: s.image_url })) };
      }
      
      await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setEditImage(data.url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const filteredSections = sections.filter((s) => s.page === activePage);

  if (loading) {
    return <div className="text-sm text-gray-400">加载中...</div>;
  }

  return (
    <div className="max-w-4xl">
      {saved && (
        <div className="mb-4 px-4 py-2 bg-green-50 text-green-700 text-sm rounded-md border border-green-200">
          内容已保存到数据库，刷新前台页面即可看到更新
        </div>
      )}

      {/* Page Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {PAGE_OPTIONS.map((page) => (
          <button
            key={page.id}
            onClick={() => setActivePage(page.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activePage === page.id
                ? 'bg-brand-blue text-white'
                : 'bg-white text-foreground border border-border hover:bg-gray-50'
            }`}
          >
            <page.icon className="w-4 h-4" />
            {page.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <button
          onClick={addSection}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-blue text-white rounded-md hover:bg-brand-blue-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增{PAGE_OPTIONS.find((p) => p.id === activePage)?.label}内容板块
        </button>
      </div>

      <div className="space-y-4">
        {filteredSections.map((section) => (
          <div key={section.id} className="bg-white rounded-xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-blue" />
                {editingId === section.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-sm font-semibold text-navy border border-border rounded px-2 py-1"
                  />
                ) : (
                  <h3 className="text-sm font-semibold text-navy">{section.title}</h3>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingId === section.id ? (
                  <button
                    onClick={saveEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-blue text-white rounded-md hover:bg-brand-blue-light transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    保存
                  </button>
                ) : (
                  <button
                    onClick={() => startEdit(section)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-blue border border-brand-blue/20 rounded-md hover:bg-brand-blue/5 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    编辑
                  </button>
                )}
                <button
                  onClick={() => deleteSection(section.id)}
                  className="px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              {editingId === section.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">页面归属</label>
                    <select
                      value={editPage}
                      onChange={(e) => setEditPage(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    >
                      {PAGE_OPTIONS.map((page) => (
                        <option key={page.id} value={page.id}>
                          {page.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">内容描述</label>
                    <textarea
                      rows={4}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors resize-none"
                      placeholder="输入该板块的详细介绍内容..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">配图上传</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 text-foreground rounded-md hover:bg-gray-200 transition-colors cursor-pointer">
                        <Image className="w-4 h-4" />
                        选择图片
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      {editImage && (
                        <div className="flex items-center gap-2">
                          <img src={editImage} alt="preview" className="w-16 h-16 object-cover rounded-md border border-border" />
                          <button
                            onClick={() => setEditImage('')}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            移除
                          </button>
                        </div>
                      )}
                    </div>
                    {editImage && (
                      <p className="text-xs text-gray-400 mt-1">图片路径: {editImage}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  {section.image_url && (
                    <img src={section.image_url} alt={section.title} className="w-24 h-24 object-cover rounded-md border border-border" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-foreground/80 leading-relaxed">{section.content || '暂无内容'}</p>
                    {section.image_url && (
                      <p className="text-xs text-gray-400 mt-2">配图: {section.image_url}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-border/50">
            暂无{PAGE_OPTIONS.find((p) => p.id === activePage)?.label}内容板块，请点击"新增内容板块"添加
          </div>
        )}
      </div>
    </div>
  );
}
