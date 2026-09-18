'use client';

import { useState, useEffect } from 'react';
import { Shield, Award, Users, Lightbulb, Truck } from 'lucide-react';

interface AboutSection {
  id: string;
  section_key: string;
  title: string;
  content: string;
  images: string[];
}

interface MediaAsset {
  id: string;
  name: string;
  type: string;
  category: string;
  url: string;
}

const defaultAdvantages = [
  { icon: Shield, title: '安全可靠', desc: '多重冗余安全架构，累计安全运营超1000万公里，零重大安全事故' },
  { icon: Lightbulb, title: '技术领先', desc: '自研L4级自动驾驶算法，多传感器融合感知，适应复杂场景' },
  { icon: Award, title: '行业经验', desc: '深耕无人车领域多年，服务50+企业客户，覆盖物流/制造/港口等行业' },
  { icon: Users, title: '专业团队', desc: '核心团队来自顶尖自动驾驶企业，平均行业经验超10年' },
];

export default function AboutPage() {
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAbout() {
      try {
        const t = Date.now();
        const fetchOptions = { cache: 'no-store' as RequestCache };
        const [aboutRes, mediaRes] = await Promise.all([
          fetch(`/api/about?t=${t}`, fetchOptions),
          fetch(`/api/media?t=${t}`, fetchOptions),
        ]);
        const data = await aboutRes.json();
        const mediaData = await mediaRes.json();
        
        if (data.data?.length > 0) {
          setSections(data.data);
        }
        setMediaAssets(mediaData.data || []);
      } catch (error) {
        console.error('Failed to fetch about:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAbout();
  }, []);

  const getSection = (key: string) => sections.find(s => s.section_key === key);
  const introSection = getSection('intro');
  const certificatesSection = getSection('certificates');
  const advantagesSection = getSection('advantages');
  const teamSection = getSection('team');
  
  // Get media images for about page
  const aboutImages = mediaAssets.filter(m => m.category === 'about' || m.category === '关于我们').map(m => m.url);

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
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">关于我们</h1>
          <p className="text-lg text-white/60 max-w-2xl">
            以技术创新驱动智能运力变革，让无人驾驶触手可及
          </p>
        </div>
      </section>

      {/* Company Intro */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold text-navy mb-8">
              {introSection?.title || '公司简介'}
            </h2>
            <div className="space-y-6 text-foreground/80 leading-relaxed">
              {introSection?.content ? (
                introSection.content.split('\n').filter(Boolean).map((p, i) => (
                  <p key={i}>{p}</p>
                ))
              ) : (
                <>
                  <p>
                    车领驭科技有限公司成立于2020年，是一家专注于L4级自动驾驶无人车研发、制造与运营的高科技企业。
                    公司总部位于上海，在北京、深圳、成都设有研发中心。
                  </p>
                  <p>
                    我们致力于通过自动驾驶技术革新传统运力模式，为企业提供降本增效的智能运输解决方案，
                    为个人带来安全便捷的出行体验。核心产品涵盖无人货车与行驶器无人车两大系列，
                    广泛应用于封闭园区、厂区、物流干线、景区观光等多元场景。
                  </p>
                  <p>
                    截至目前，车领驭已在全国20+城市部署运营，累计安全行驶超1000万公里，
                    服务50+企业客户，成为国内共享无人车领域的领先品牌。
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Certificates */}
      <section className="py-20 lg:py-28 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-navy mb-8">
            {certificatesSection?.title || '企业资质与荣誉'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {certificatesSection?.images && certificatesSection.images.length > 0 ? (
              certificatesSection.images.map((img, i) => (
                <div key={i} className="aspect-[4/3] rounded-lg bg-white border border-border/50 flex items-center justify-center hover:shadow-md transition-shadow overflow-hidden">
                  <img src={img} alt={`证书${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))
            ) : (
              ['自动驾驶路测牌照', 'ISO 9001认证', '高新技术企业', '发明专利证书', 'ISO 26262认证', '3C认证'].map((cert) => (
                <div key={cert} className="aspect-[4/3] rounded-lg bg-white border border-border/50 flex items-center justify-center hover:shadow-md transition-shadow">
                  <div className="text-center p-4">
                    <Award className="w-8 h-8 text-brand-blue/30 mx-auto mb-2" />
                    <span className="text-xs text-muted-foreground">{cert}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Core Advantages */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-navy mb-12">
            {advantagesSection?.title || '核心优势'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {defaultAdvantages.map((item) => (
              <div key={item.title} className="p-6 rounded-xl border border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <item.icon className="w-10 h-10 text-brand-blue mb-4" />
                <h3 className="text-lg font-semibold text-navy mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 lg:py-28 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-navy mb-12">
            {teamSection?.title || '团队风采'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamSection?.images && teamSection.images.length > 0 ? (
              teamSection.images.map((img, i) => (
                <div key={i} className="group">
                  <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-navy/5 to-brand-blue/5 border border-border/50 overflow-hidden mb-3 group-hover:shadow-md transition-shadow">
                    <img src={img} alt={`团队${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                </div>
              ))
            ) : (
              [
                { label: '研发团队', desc: '自动驾驶算法与工程' },
                { label: '运营团队', desc: '项目管理与客户服务' },
                { label: '产品团队', desc: '产品设计与用户体验' },
                { label: '测试团队', desc: '质量保证与安全验证' },
              ].map((item) => (
                <div key={item.label} className="group">
                  <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-navy/5 to-brand-blue/5 border border-border/50 flex items-center justify-center mb-3 group-hover:shadow-md transition-shadow">
                    <div className="text-center">
                      <Users className="w-10 h-10 text-navy/20 mx-auto mb-1" />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">{item.desc}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Milestone */}
      <section className="py-20 lg:py-28 bg-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">发展历程</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { year: '2020', event: '公司成立，完成天使轮融资' },
              { year: '2021', event: '首款L4无人货车下线，获得路测牌照' },
              { year: '2022', event: '首个企业客户项目落地，完成A轮融资' },
              { year: '2023', event: '运营城市突破20个，累计里程超1000万公里' },
            ].map((item) => (
              <div key={item.year} className="text-center">
                <div className="text-3xl font-bold text-brand-blue mb-2">{item.year}</div>
                <p className="text-sm text-white/60">{item.event}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
