'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaseItem {
  id: string;
  title: string;
  description: string;
  images: string[];
  category: string;
}

interface MediaAsset {
  id: string;
  name: string;
  type: string;
  category: string;
  url: string;
}

const defaultEnterpriseCases: CaseItem[] = [
  { id: '1', title: '某大型物流园区无人转运项目', description: '部署20台无人货车，实现园区内部24小时自动化转运', images: [], category: 'enterprise' },
  { id: '2', title: '某汽车工厂车间间物料搬运', description: '为工厂提供无人货车租赁服务，替代传统人工搬运', images: [], category: 'enterprise' },
  { id: '3', title: '某港口集装箱短驳项目', description: '承接运力项目，实现港口集装箱自动化短驳', images: [], category: 'enterprise' },
];

const defaultPersonalCases: CaseItem[] = [
  { id: '1', title: '园区通勤体验', description: '在科技园区体验行驶器无人车通勤服务', images: [], category: 'personal' },
  { id: '2', title: '景区观光体验', description: '在景区乘坐行驶器无人车观光游览', images: [], category: 'personal' },
];

export default function CasesPage() {
  const [activeTab, setActiveTab] = useState<'enterprise' | 'personal'>('enterprise');
  const [enterpriseCases, setEnterpriseCases] = useState<CaseItem[]>([]);
  const [personalCases, setPersonalCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCases() {
      try {
        const t = Date.now();
        const fetchOptions = { cache: 'no-store' as RequestCache };
        const [casesRes, mediaRes] = await Promise.all([
          fetch(`/api/cases?t=${t}`, fetchOptions),
          fetch(`/api/media?t=${t}`, fetchOptions),
        ]);
        const data = await casesRes.json();
        const mediaData = await mediaRes.json();
        const mediaAssets: MediaAsset[] = mediaData.data || [];
        
        if (data.data?.length > 0) {
          const cases = data.data;
          setEnterpriseCases(cases.filter((c: CaseItem) => c.category === 'enterprise'));
          setPersonalCases(cases.filter((c: CaseItem) => c.category === 'personal'));
        } else {
          // Use media assets for case images
          const enterpriseImages = mediaAssets.filter(m => m.category === 'case_enterprise' || m.category === '案例图片' || m.category === '案例-企业项目').map(m => m.url);
          const personalImages = mediaAssets.filter(m => m.category === 'case_personal' || m.category === '案例-个人体验').map(m => m.url);
          
          setEnterpriseCases(defaultEnterpriseCases.map((c, i) => ({
            ...c,
            images: enterpriseImages[i] ? [enterpriseImages[i]] : [],
          })));
          setPersonalCases(defaultPersonalCases.map((c, i) => ({
            ...c,
            images: personalImages[i] ? [personalImages[i]] : [],
          })));
        }
      } catch (error) {
        console.error('Failed to fetch cases:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCases();
  }, []);

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="pt-16">
      {/* Header */}
      <section className="py-20 lg:py-28 bg-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">项目案例</h1>
          <p className="text-lg text-white/60 max-w-2xl">
            已落地多个行业标杆项目，覆盖物流、制造、港口、个人出行等多元场景
          </p>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 mb-12 border-b border-border pb-1">
            <button
              onClick={() => setActiveTab('enterprise')}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-md transition-colors -mb-px border-b-2',
                activeTab === 'enterprise'
                  ? 'text-brand-blue border-brand-blue'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              <Building2 className="w-4 h-4" />
              企业项目案例
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-md transition-colors -mb-px border-b-2',
                activeTab === 'personal'
                  ? 'text-brand-cyan border-brand-cyan'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              <Users className="w-4 h-4" />
              个人体验案例
            </button>
          </div>

          {/* Enterprise cases */}
          {activeTab === 'enterprise' && (
            <div className="space-y-12">
              {enterpriseCases.length > 0 ? enterpriseCases.map((item) => (
                <div key={item.id} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="aspect-[16/10] rounded-xl bg-gradient-to-br from-navy/5 to-brand-blue/5 border border-border/50 flex items-center justify-center overflow-hidden">
                    {item.images && item.images.length > 0 ? (
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <MapPin className="w-16 h-16 text-navy/20" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-navy mb-4">{item.title}</h3>
                    <p className="text-foreground/80 leading-relaxed mb-6">{item.description}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-gray-400">暂无企业案例，请在后台添加</div>
              )}
            </div>
          )}

          {/* Personal cases */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {personalCases.length > 0 ? personalCases.map((item) => (
                <div key={item.id} className="bg-surface rounded-xl border border-border/50 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <div className="aspect-square bg-gradient-to-br from-navy/3 to-brand-cyan/5 flex items-center justify-center overflow-hidden">
                    {item.images && item.images.length > 0 ? (
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-navy/15" />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-navy mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-center py-12 text-gray-400">暂无个人案例，请在后台添加</div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
