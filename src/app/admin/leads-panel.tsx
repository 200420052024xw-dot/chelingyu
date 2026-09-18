'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lead {
  id: string;
  type: string;
  company_name?: string;
  contact_person?: string;
  name?: string;
  phone: string;
  intention?: string;
  planned_time?: string;
  scenario?: string;
  message?: string;
  is_followed: boolean;
  created_at: string;
}

export function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'enterprise' | 'personal'>('all');
  const [followFilter, setFollowFilter] = useState<'all' | 'followed' | 'unfollowed'>('all');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const t = Date.now();
      const res = await fetch(`/api/leads?t=${t}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.data) setLeads(json.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const toggleFollow = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_followed: !current }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, is_followed: !current } : l))
        );
      }
    } catch {
      // silent
    }
  };

  const exportCSV = () => {
    const headers = ['类型', '公司名称', '联系人', '电话', '意向', '场景', '留言', '跟进状态', '提交时间'];
    const rows = filteredLeads.map((l) => [
      l.type === 'enterprise' ? '企业' : '个人',
      l.company_name || '',
      l.contact_person || l.name || '',
      l.phone,
      l.intention || '',
      l.scenario || '',
      l.message || '',
      l.is_followed ? '已跟进' : '未跟进',
      new Date(l.created_at).toLocaleString('zh-CN'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `客户线索_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLeads = leads.filter((l) => {
    if (filter !== 'all' && l.type !== filter) return false;
    if (followFilter === 'followed' && !l.is_followed) return false;
    if (followFilter === 'unfollowed' && l.is_followed) return false;
    return true;
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-white rounded-lg border border-border/50 p-1">
          {(['all', 'enterprise', 'personal'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                filter === f ? 'bg-brand-blue text-white' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? '全部' : f === 'enterprise' ? '企业' : '个人'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white rounded-lg border border-border/50 p-1">
          {(['all', 'unfollowed', 'followed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFollowFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                followFilter === f ? 'bg-navy text-white' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? '全部状态' : f === 'followed' ? '已跟进' : '未跟进'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={fetchLeads}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border/50 rounded-md hover:bg-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-blue border border-brand-blue/20 rounded-md hover:bg-brand-blue/5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            导出表格
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-surface/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">类型</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">公司/姓名</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">联系电话</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">详情</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">时间</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">跟进</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    加载中...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    暂无线索数据
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/30 hover:bg-surface/30 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                          lead.type === 'enterprise'
                            ? 'bg-brand-blue/10 text-brand-blue'
                            : 'bg-brand-cyan/10 text-brand-cyan'
                        )}
                      >
                        {lead.type === 'enterprise' ? '企业' : '个人'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">
                        {lead.company_name || lead.name || '-'}
                      </div>
                      {lead.contact_person && (
                        <div className="text-xs text-muted-foreground">{lead.contact_person}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">{lead.phone}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-[200px]">
                        {lead.scenario && (
                          <div className="text-xs text-muted-foreground">场景: {lead.scenario}</div>
                        )}
                        {lead.intention && (
                          <div className="text-xs text-muted-foreground">意向: {lead.intention}</div>
                        )}
                        {lead.message && (
                          <div className="text-xs text-muted-foreground truncate" title={lead.message}>
                            {lead.message}
                          </div>
                        )}
                        {!lead.scenario && !lead.intention && !lead.message && '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleFollow(lead.id, lead.is_followed)}
                        className={cn(
                          'inline-flex items-center gap-1 text-xs transition-colors',
                          lead.is_followed ? 'text-green-600' : 'text-muted-foreground hover:text-brand-blue'
                        )}
                      >
                        {lead.is_followed ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            已跟进
                          </>
                        ) : (
                          <>
                            <Circle className="w-3.5 h-3.5" />
                            未跟进
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
