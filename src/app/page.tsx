'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Truck,
  Package,
  Users,
  MapPin,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  Shield,
  Zap,
} from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
}

interface Service {
  id: string;
  title: string;
  description: string;
  image_url: string;
  category: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  category: string;
}

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

interface Settings {
  [key: string]: string;
}

const defaultBanners = [
  { id: '1', title: '车领驭｜共享无人车', subtitle: '无人货车销售·租赁·运力一体化解决方案', image_url: '' },
  { id: '2', title: '智能运力 · 降本增效', subtitle: '覆盖封闭园区、厂区、物流干线多元场景', image_url: '' },
  { id: '3', title: '灵活租赁 · 按需定制', subtitle: '从短期体验到长期运营，多种合作模式', image_url: '' },
];

const enterpriseIcons = [Truck, Package, Zap, MapPin];
const personalIcons = [User, Shield];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState<Banner[]>(defaultBanners);
  const [enterpriseServices, setEnterpriseServices] = useState<Service[]>([]);
  const [personalServices, setPersonalServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [enterpriseCases, setEnterpriseCases] = useState<CaseItem[]>([]);
  const [personalCases, setPersonalCases] = useState<CaseItem[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Add timestamp to bust any cache
        const t = Date.now();
        const fetchOptions = { cache: 'no-store' as RequestCache };
        const [bannersRes, servicesRes, productsRes, casesRes, settingsRes, mediaRes] = await Promise.all([
          fetch(`/api/banners?t=${t}`, fetchOptions),
          fetch(`/api/services?t=${t}`, fetchOptions),
          fetch(`/api/products?t=${t}`, fetchOptions),
          fetch(`/api/cases?t=${t}`, fetchOptions),
          fetch(`/api/settings?t=${t}`, fetchOptions),
          fetch(`/api/media?t=${t}`, fetchOptions),
        ]);

        const bannersData = await bannersRes.json();
        const servicesData = await servicesRes.json();
        const productsData = await productsRes.json();
        const casesData = await casesRes.json();
        const settingsData = await settingsRes.json();
        const mediaData = await mediaRes.json();
        
        const mediaAssets: MediaAsset[] = mediaData.data || [];

        // Use banners from database or defaults with media images
        if (bannersData.data?.length > 0) {
          setBanners(bannersData.data);
        } else {
          const bannerImages = mediaAssets.filter(m => m.category === 'home_banner' || m.category === '首页Banner').map(m => m.url);
          setBanners(defaultBanners.map((b, i) => ({
            ...b,
            image_url: bannerImages[i] || '',
          })));
        }
        
        const services = servicesData.data || [];
        setEnterpriseServices(services.filter((s: Service) => s.category === 'enterprise'));
        setPersonalServices(services.filter((s: Service) => s.category === 'personal'));
        
        // Use products from database or defaults with media images
        if (productsData.data?.length > 0) {
          setProducts(productsData.data);
        } else {
          const truckImages = mediaAssets.filter(m => m.category === 'product_truck' || m.category === '产品图片' || m.category === '产品-无人货车').map(m => m.url);
          const vehicleImages = mediaAssets.filter(m => m.category === 'product_vehicle' || m.category === '产品-行驶器无人车').map(m => m.url);
          setProducts([
            { id: '1', name: '无人货车', description: '专为物流运输设计的L4级自动驾驶货车', images: truckImages, category: 'truck' },
            { id: '2', name: '行驶器无人车', description: '智能代步与短途出行工具', images: vehicleImages, category: 'vehicle' },
          ]);
        }
        
        // Use cases from database or defaults with media images
        const cases = casesData.data || [];
        if (cases.length > 0) {
          setEnterpriseCases(cases.filter((c: CaseItem) => c.category === 'enterprise'));
          setPersonalCases(cases.filter((c: CaseItem) => c.category === 'personal'));
        } else {
          const enterpriseCaseImages = mediaAssets.filter(m => m.category === 'case_enterprise' || m.category === '案例图片' || m.category === '案例-企业项目').map(m => m.url);
          const personalCaseImages = mediaAssets.filter(m => m.category === 'case_personal' || m.category === '案例-个人体验').map(m => m.url);
          setEnterpriseCases([
            { id: '1', title: '某大型物流园区无人转运项目', description: '部署20台无人货车，实现园区内部24小时自动化转运', images: enterpriseCaseImages.slice(0, 1), category: 'enterprise' },
            { id: '2', title: '某汽车工厂车间间物料搬运', description: '为工厂提供无人货车租赁服务，替代传统人工搬运', images: enterpriseCaseImages.slice(1, 2), category: 'enterprise' },
          ]);
          setPersonalCases([
            { id: '1', title: '园区通勤体验', description: '在科技园区体验行驶器无人车通勤服务', images: personalCaseImages.slice(0, 1), category: 'personal' },
          ]);
        }
        
        setSettings(settingsData.data || {});
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const siteName = settings.site_name || '车领驭共享无人车';
  const brandDesc = settings.brand_description || '专注无人车销售、租赁与运力服务，覆盖封闭园区、厂区、物流干线、个人多元化用车场景';

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="pt-16">
      {/* Hero Banner */}
      <section className="relative h-[85vh] min-h-[500px] overflow-hidden">
        {banners.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-800 ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {slide.image_url ? (
              <img src={slide.image_url} alt={slide.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy" />
            )}
            <div className="absolute inset-0 bg-black/30" />
            {/* Decorative grid */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }} />
            {/* Decorative circles */}
            <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-brand-blue/5 blur-3xl" />
            <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-brand-cyan/5 blur-3xl" />
            
            <div className="relative h-full flex items-center justify-center text-center px-4">
              <div className="max-w-4xl animate-fade-in-up">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
                  {slide.title}
                </h1>
                <p className="text-xl md:text-2xl text-white/80 mb-4 font-light">
                  {slide.subtitle}
                </p>
                <p className="text-base md:text-lg text-white/60 mb-10">
                  企业运力方案定制 + 个人租购体验服务
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/contact?tab=enterprise"
                    className="inline-flex items-center justify-center px-8 py-4 bg-brand-cyan text-white font-medium rounded-md hover:bg-brand-cyan/90 transition-all duration-300 hover:scale-105"
                  >
                    企业合作咨询
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                  <Link
                    href="/contact?tab=personal"
                    className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-medium rounded-md border border-white/20 hover:bg-white/20 transition-all duration-300"
                  >
                    个人预约体验
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Navigation arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        
        {/* Dots indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide ? 'w-8 bg-brand-cyan' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Brand Section */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy/5 mb-6">
              <Building2 className="w-8 h-8 text-navy" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-6">{siteName}</h2>
            <p className="text-lg text-gray-600 leading-relaxed">{brandDesc}</p>
          </div>
        </div>
      </section>

      {/* Business Sections */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">业务服务</h2>
            <p className="text-gray-600">B端企业服务 + C端个人业务，全方位满足您的需求</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Enterprise Services */}
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy">企业B端服务</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {enterpriseServices.length > 0 ? enterpriseServices.map((service, index) => {
                  const Icon = enterpriseIcons[index] || Truck;
                  return (
                    <Link
                      key={service.id}
                      href="/services"
                      className="group p-5 rounded-lg border border-gray-100 hover:border-brand-cyan/30 hover:shadow-md transition-all duration-300"
                    >
                      <Icon className="w-8 h-8 text-brand-cyan mb-3" />
                      <h4 className="font-semibold text-navy mb-1 group-hover:text-brand-cyan transition-colors">
                        {service.title}
                      </h4>
                      <p className="text-sm text-gray-500">{service.description}</p>
                    </Link>
                  );
                }) : (
                  // Default fallback
                  <>
                    <Link href="/services" className="group p-5 rounded-lg border border-gray-100 hover:border-brand-cyan/30 hover:shadow-md transition-all duration-300">
                      <Truck className="w-8 h-8 text-brand-cyan mb-3" />
                      <h4 className="font-semibold text-navy mb-1">车辆销售</h4>
                      <p className="text-sm text-gray-500">L4级无人货车整车销售</p>
                    </Link>
                    <Link href="/services" className="group p-5 rounded-lg border border-gray-100 hover:border-brand-cyan/30 hover:shadow-md transition-all duration-300">
                      <Package className="w-8 h-8 text-brand-cyan mb-3" />
                      <h4 className="font-semibold text-navy mb-1">整车长租</h4>
                      <p className="text-sm text-gray-500">年度/多年期整车租赁</p>
                    </Link>
                    <Link href="/services" className="group p-5 rounded-lg border border-gray-100 hover:border-brand-cyan/30 hover:shadow-md transition-all duration-300">
                      <Zap className="w-8 h-8 text-brand-cyan mb-3" />
                      <h4 className="font-semibold text-navy mb-1">分段灵活租赁</h4>
                      <p className="text-sm text-gray-500">按需租赁，灵活调配</p>
                    </Link>
                    <Link href="/services" className="group p-5 rounded-lg border border-gray-100 hover:border-brand-cyan/30 hover:shadow-md transition-all duration-300">
                      <MapPin className="w-8 h-8 text-brand-cyan mb-3" />
                      <h4 className="font-semibold text-navy mb-1">运力项目承接</h4>
                      <p className="text-sm text-gray-500">端到端运力解决方案</p>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Personal Services */}
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-brand-cyan flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy">个人C端服务</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {personalServices.length > 0 ? personalServices.map((service, index) => {
                  const Icon = personalIcons[index] || User;
                  return (
                    <Link
                      key={service.id}
                      href="/services"
                      className="group p-5 rounded-lg border border-gray-100 hover:border-brand-cyan/30 hover:shadow-md transition-all duration-300"
                    >
                      <Icon className="w-8 h-8 text-brand-cyan mb-3" />
                      <h4 className="font-semibold text-navy mb-1 group-hover:text-brand-cyan transition-colors">
                        {service.title}
                      </h4>
                      <p className="text-sm text-gray-500">{service.description}</p>
                    </Link>
                  );
                }) : (
                  <>
                    <Link href="/services" className="group p-5 rounded-lg border border-gray-100 hover:border-brand-cyan/30 hover:shadow-md transition-all duration-300">
                      <User className="w-8 h-8 text-brand-cyan mb-3" />
                      <h4 className="font-semibold text-navy mb-1">个人短期租赁</h4>
                      <p className="text-sm text-gray-500">日租/周租/月租灵活体验</p>
                    </Link>
                    <Link href="/services" className="group p-5 rounded-lg border border-gray-100 hover:border-brand-cyan/30 hover:shadow-md transition-all duration-300">
                      <Shield className="w-8 h-8 text-brand-cyan mb-3" />
                      <h4 className="font-semibold text-navy mb-1">个人整车采购</h4>
                      <p className="text-sm text-gray-500">面向个人的无人车购买</p>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Preview */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">产品展示</h2>
            <p className="text-gray-600">智能无人车，为多元场景而生</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {products.length > 0 ? products.map((product) => (
              <Link
                key={product.id}
                href="/products"
                className="group relative overflow-hidden rounded-lg bg-gray-50 aspect-[4/3] hover:shadow-xl transition-all duration-300"
              >
                {product.images && product.images.length > 0 ? (
                  <img src={product.images[0]} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-navy/5 to-brand-cyan/5 flex items-center justify-center">
                    {product.category === 'truck' ? <Truck className="w-24 h-24 text-navy/20" /> : <Package className="w-24 h-24 text-navy/20" />}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{product.name}</h3>
                  <p className="text-white/80 text-sm line-clamp-2">{product.description}</p>
                </div>
              </Link>
            )) : (
              <>
                <Link href="/products" className="group relative overflow-hidden rounded-lg bg-gray-50 aspect-[4/3] hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-navy/5 to-brand-cyan/5 flex items-center justify-center">
                    <Truck className="w-24 h-24 text-navy/20" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">无人货车</h3>
                    <p className="text-white/80 text-sm">L4级自动驾驶货运车辆</p>
                  </div>
                </Link>
                <Link href="/products" className="group relative overflow-hidden rounded-lg bg-gray-50 aspect-[4/3] hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-navy/5 to-brand-cyan/5 flex items-center justify-center">
                    <Package className="w-24 h-24 text-navy/20" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">行驶器无人车</h3>
                    <p className="text-white/80 text-sm">紧凑型智能出行载具</p>
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Cases Section */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">项目案例</h2>
            <p className="text-gray-600">企业落地项目与个人用车体验</p>
          </div>

          {/* Enterprise Cases */}
          {enterpriseCases.length > 0 && (
            <div className="mb-12">
              <h3 className="text-xl font-bold text-navy mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                企业落地项目
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enterpriseCases.map((caseItem) => (
                  <div key={caseItem.id} className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="aspect-video bg-gray-100 overflow-hidden">
                      {caseItem.images && caseItem.images.length > 0 ? (
                        <img src={caseItem.images[0]} alt={caseItem.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-navy mb-1">{caseItem.title}</h4>
                      <p className="text-sm text-gray-500 line-clamp-2">{caseItem.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal Cases */}
          {personalCases.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-navy mb-6 flex items-center gap-2">
                <User className="w-5 h-5" />
                个人用车体验
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {personalCases.map((caseItem) => (
                  <div key={caseItem.id} className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      {caseItem.images && caseItem.images.length > 0 ? (
                        <img src={caseItem.images[0]} alt={caseItem.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-navy text-sm mb-1">{caseItem.title}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2">{caseItem.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {enterpriseCases.length === 0 && personalCases.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Link href="/cases" className="text-brand-cyan hover:underline">查看更多案例 →</Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-navy relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand-cyan blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-brand-blue blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">开启智能出行新体验</h2>
          <p className="text-lg text-white/70 mb-10">
            无论是企业运力需求还是个人出行体验，车领驭都能为您提供专业解决方案
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact?tab=enterprise"
              className="inline-flex items-center justify-center px-8 py-4 bg-brand-cyan text-white font-medium rounded-md hover:bg-brand-cyan/90 transition-all"
            >
              企业合作咨询
            </Link>
            <Link
              href="/contact?tab=personal"
              className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-medium rounded-md border border-white/20 hover:bg-white/20 transition-all"
            >
              个人预约体验
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
