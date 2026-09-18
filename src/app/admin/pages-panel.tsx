'use client';

import { useState } from 'react';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageItem {
  id: string;
  name: string;
  path: string;
  visible: boolean;
}

interface CaseItem {
  id: string;
  title: string;
  category: string;
}

const initialPages: PageItem[] = [
  { id: 'home', name: '首页', path: '/', visible: true },
  { id: 'products', name: '产品中心', path: '/products', visible: true },
  { id: 'services', name: '业务服务', path: '/services', visible: true },
  { id: 'cases', name: '项目案例', path: '/cases', visible: true },
  { id: 'about', name: '关于我们', path: '/about', visible: true },
  { id: 'contact', name: '联系咨询', path: '/contact', visible: true },
];

const initialCases: CaseItem[] = [
  { id: '1', title: '某大型物流园区无人配送项目', category: 'enterprise' },
  { id: '2', title: '某制造厂区智能搬运项目', category: 'enterprise' },
  { id: '3', title: '某港口集装箱转运项目', category: 'enterprise' },
  { id: '4', title: '科技园区通勤体验', category: 'personal' },
  { id: '5', title: '景区观光租赁', category: 'personal' },
  { id: '6', title: '周末搬家体验', category: 'personal' },
  { id: '7', title: '科技尝鲜之旅', category: 'personal' },
];

export function PagesPanel() {
  const [pages, setPages] = useState<PageItem[]>(initialPages);
  const [cases, setCases] = useState<CaseItem[]>(initialCases);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseCategory, setNewCaseCategory] = useState<'enterprise' | 'personal'>('enterprise');

  const togglePageVisibility = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p))
    );
  };

  const addCase = () => {
    if (!newCaseTitle.trim()) return;
    const newCase: CaseItem = {
      id: Date.now().toString(),
      title: newCaseTitle,
      category: newCaseCategory,
    };
    setCases((prev) => [...prev, newCase]);
    setNewCaseTitle('');
  };

  const deleteCase = (id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Page management */}
      <div className="bg-white rounded-xl border border-border/50 p-6">
        <h3 className="text-sm font-semibold text-navy mb-4">页面管理</h3>
        <div className="space-y-2">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface/50 border border-border/30"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-navy">{page.name}</span>
                <span className="text-xs text-muted-foreground">{page.path}</span>
              </div>
              <button
                onClick={() => togglePageVisibility(page.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  page.visible
                    ? 'text-green-700 bg-green-50 hover:bg-green-100'
                    : 'text-muted-foreground bg-gray-50 hover:bg-gray-100'
                )}
              >
                {page.visible ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    显示中
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    已隐藏
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Case management */}
      <div className="bg-white rounded-xl border border-border/50 p-6">
        <h3 className="text-sm font-semibold text-navy mb-4">案例管理</h3>

        {/* Add new case */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={newCaseTitle}
            onChange={(e) => setNewCaseTitle(e.target.value)}
            placeholder="输入案例标题"
            className="flex-1 px-4 py-2 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
          />
          <select
            value={newCaseCategory}
            onChange={(e) => setNewCaseCategory(e.target.value as 'enterprise' | 'personal')}
            className="px-3 py-2 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
          >
            <option value="enterprise">企业案例</option>
            <option value="personal">个人案例</option>
          </select>
          <button
            onClick={addCase}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-blue text-white rounded-md hover:bg-brand-blue-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增
          </button>
        </div>

        {/* Cases list */}
        <div className="space-y-2">
          {cases.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface/50 border border-border/30"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                    c.category === 'enterprise'
                      ? 'bg-brand-blue/10 text-brand-blue'
                      : 'bg-brand-cyan/10 text-brand-cyan'
                  )}
                >
                  {c.category === 'enterprise' ? '企业' : '个人'}
                </span>
                <span className="text-sm text-navy">{c.title}</span>
              </div>
              <button
                onClick={() => deleteCase(c.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
