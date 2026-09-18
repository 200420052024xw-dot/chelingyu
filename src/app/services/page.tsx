'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  Package,
  Zap,
  MapPin,
  User,
  Shield,
  ArrowRight,
  Building2,
  Users,
} from 'lucide-react';

interface Service {
  id: string;
  title: string;
  description: string;
  image_url: string;
  cooperation_mode: string;
  scenarios: string;
  category: string;
}

interface MediaAsset {
  id: string;
  name: string;
  type: string;
  category: string;
  url: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  '车辆销售': Truck,
  '整车租赁': Package,
  '分段灵活租赁': Zap,
  '运力项目承接': MapPin,
  '个人短期体验租赁': User,
  '个人购车服务': Shield,
};

const defaultEnterprise = [
  { id: '1', title: '车辆销售', description: '提供L4级自动驾驶无人货车整车销售服务，支持定制化配置。', image_url: '', cooperation_mode: '标准整车交付，含基础质保3年/10万公里。', scenarios: '大型物流园区、制造工厂、港口码头等。', category: 'enterprise' },
  { id: '2', title: '整车租赁', description: '年度/多年期整车租赁方案，包含车辆使用、日常运维、保险保障等一站式服务。', image_url: '', cooperation_mode: '租期灵活（1年起），租金含运维费用。', scenarios: '有稳定运输需求但不愿重资产投入的企业。', category: 'enterprise' },
  { id: '3', title: '分段灵活租赁', description: '按需租赁，支持日租、周租、月租多种模式。', image_url: '', cooperation_mode: '按实际使用时长/里程计费，无最低消费。', scenarios: '季节性波动明显的业务场景。', category: 'enterprise' },
  { id: '4', title: '运力项目承接', description: '端到端运力解决方案，从路线规划到车辆部署运营。', image_url: '', cooperation_mode: '按项目制合作，根据运力需求定制方案。', scenarios: '希望整体外包运输环节的企业。', category: 'enterprise' },
];

const defaultPersonal = [
  { id: '5', title: '个人短期体验租赁', description: '面向个人用户的无人车体验服务。日租/周租/月租灵活选择。', image_url: '', cooperation_mode: '线上预约，线下取车。含基础保险与24小时道路救援。', scenarios: '科技爱好者尝鲜、周末家庭出游等。', category: 'personal' },
  { id: '6', title: '个人购车服务', description: '面向个人的无人车整车购买服务。', image_url: '', cooperation_mode: '支持全款/分期购车。含3年基础质保。', scenarios: '高端社区/别墅区日常出行等。', category: 'personal' },
];

export default function ServicesPage() {
  const [enterpriseServices, setEnterpriseServices] = useState<Service[]>([]);
  const [personalServices, setPersonalServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      try {
        const t = Date.now();
        const fetchOptions = { cache: 'no-store' as RequestCache };
        const [servicesRes, mediaRes] = await Promise.all([
          fetch(`/api/services?t=${t}`, fetchOptions),
          fetch(`/api/media?t=${t}`, fetchOptions),
        ]);
        const data = await servicesRes.json();
        const mediaData = await mediaRes.json();
        const mediaAssets: MediaAsset[] = mediaData.data || [];
        
        if (data.data?.length > 0) {
          const services = data.data;
          setEnterpriseServices(services.filter((s: Service) => s.category === 'enterprise'));
          setPersonalServices(services.filter((s: Service) => s.category === 'personal'));
        } else {
          // Use media assets for service images
          const bImages = mediaAssets.filter(m => m.category === 'service_b' || m.category === '业务-B端服务').map(m => m.url);
          const cImages = mediaAssets.filter(m => m.category === 'service_c' || m.category === '业务-C端服务').map(m => m.url);
          
          setEnterpriseServices(defaultEnterprise.map((s, i) => ({
            ...s,
            image_url: bImages[i] || '',
          })));
          setPersonalServices(defaultPersonal.map((s, i) => ({
            ...s,
            image_url: cImages[i] || '',
          })));
        }
      } catch {
        setEnterpriseServices(defaultEnterprise);
        setPersonalServices(defaultPersonal);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  const getIcon = (title: string, category: string) => {
    return iconMap[title] || (category === 'enterprise' ? Truck : User);
  };

  return (
    <div className="pt-16">
      {/* Header */}
      <section className="py-20 lg:py-28 bg-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">业务服务</h1>
          <p className="text-lg text-white/60 max-w-2xl">
            面向企业与个人，提供全方位的无人车服务解决方案
          </p>
        </div>
      </section>

      {/* Enterprise Services */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-12">
            <Building2 className="w-6 h-6 text-brand-blue" />
            <h2 className="text-2xl lg:text-3xl font-bold text-navy">企业B端服务专区</h2>
          </div>

          <div className="space-y-16">
            {enterpriseServices.map((service, idx) => {
              const Icon = getIcon(service.title, service.category);
              return (
                <div
                  key={service.id}
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
                    idx % 2 === 1 ? 'lg:direction-rtl' : ''
                  }`}
                >
                  <div className={idx % 2 === 1 ? 'lg:order-2' : ''}>
                    <div className="aspect-[16/10] rounded-xl bg-gradient-to-br from-navy/5 to-brand-blue/5 border border-border/50 flex items-center justify-center overflow-hidden">
                      {service.image_url ? (
                        <img src={service.image_url} alt={service.title} className="w-full h-full object-cover" />
                      ) : (
                        <Icon className="w-16 h-16 text-navy/20" />
                      )}
                    </div>
                  </div>
                  <div className={idx % 2 === 1 ? 'lg:order-1' : ''}>
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className="w-6 h-6 text-brand-blue" />
                      <h3 className="text-xl font-bold text-navy">{service.title}</h3>
                    </div>
                    <p className="text-foreground/80 leading-relaxed mb-6">{service.description}</p>

                    <div className="space-y-4">
                      {service.cooperation_mode && (
                        <div>
                          <h4 className="text-sm font-semibold text-navy mb-1">合作模式</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{service.cooperation_mode}</p>
                        </div>
                      )}
                      {service.scenarios && (
                        <div>
                          <h4 className="text-sm font-semibold text-navy mb-1">适用场景</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{service.scenarios}</p>
                        </div>
                      )}
                    </div>

                    <Link
                      href="/contact?tab=enterprise"
                      className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-brand-blue text-white rounded-md text-sm font-medium hover:bg-brand-blue-light transition-colors"
                    >
                      咨询合作 <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Personal Services */}
      <section className="py-20 lg:py-28 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-12">
            <Users className="w-6 h-6 text-brand-cyan" />
            <h2 className="text-2xl lg:text-3xl font-bold text-navy">个人C端服务专区</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {personalServices.map((service) => {
              const Icon = getIcon(service.title, service.category);
              return (
                <div
                  key={service.id}
                  className="bg-white rounded-xl border border-border/50 p-8 hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="w-6 h-6 text-brand-cyan" />
                    <h3 className="text-xl font-bold text-navy">{service.title}</h3>
                  </div>
                  <p className="text-foreground/80 leading-relaxed mb-6">{service.description}</p>

                  <div className="aspect-[16/9] rounded-lg bg-gradient-to-br from-navy/3 to-brand-cyan/5 border border-border/30 flex items-center justify-center mb-6 overflow-hidden">
                    {service.image_url ? (
                      <img src={service.image_url} alt={service.title} className="w-full h-full object-cover" />
                    ) : (
                      <Icon className="w-12 h-12 text-navy/15" />
                    )}
                  </div>

                  <div className="space-y-4 mb-6">
                    {service.cooperation_mode && (
                      <div>
                        <h4 className="text-sm font-semibold text-navy mb-1">合作模式</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{service.cooperation_mode}</p>
                      </div>
                    )}
                    {service.scenarios && (
                      <div>
                        <h4 className="text-sm font-semibold text-navy mb-1">适用场景</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{service.scenarios}</p>
                      </div>
                    )}
                  </div>

                  <Link
                    href="/contact?tab=personal"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-cyan text-white rounded-md text-sm font-medium hover:bg-brand-cyan/90 transition-colors"
                  >
                    预约体验 <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
