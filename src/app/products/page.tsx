'use client';

import { useState, useEffect } from 'react';
import { Truck, Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  specs: Record<string, string>;
  b_scenarios: string;
  c_scenarios: string;
  category: string;
}

const defaultProducts: Product[] = [
  {
    id: 'truck',
    name: '无人货车',
    category: 'truck',
    description: '面向封闭园区、厂区、物流干线等场景设计的L4级自动驾驶货运车辆。采用多传感器融合感知方案，实现全天候、全场景无人驾驶运营。',
    images: [],
    specs: { '自动驾驶等级': 'L4', '最大载重': '500kg - 2T', '续航里程': '200km+', '最高时速': '60km/h' },
    b_scenarios: '适用于大型物流园区内部转运、工厂车间间物料搬运、港口集装箱短驳、城市末端配送等场景。',
    c_scenarios: '面向个人用户提供短途货运租赁服务，如搬家运输、大件物品配送等。',
  },
  {
    id: 'shuttle',
    name: '行驶器无人车',
    category: 'shuttle',
    description: '紧凑型智能出行载具，专为封闭园区通勤、景区观光、社区接驳等场景设计。小巧灵活，安全可靠。',
    images: [],
    specs: { '自动驾驶等级': 'L4', '载客人数': '2-6人', '续航里程': '150km+', '最高时速': '40km/h' },
    b_scenarios: '适用于大型园区员工通勤、景区游客观光、医院/校园内部接驳、会展中心摆渡等场景。',
    c_scenarios: '面向个人用户提供短途出行体验租赁。用户可通过App预约，在指定区域内享受自动驾驶出行体验。',
  },
];

interface MediaAsset {
  id: string;
  name: string;
  type: string;
  category: string;
  url: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  truck: Truck,
  shuttle: Package,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const t = Date.now();
        const fetchOptions = { cache: 'no-store' as RequestCache };
        const [productsRes, mediaRes] = await Promise.all([
          fetch(`/api/products?t=${t}`, fetchOptions),
          fetch(`/api/media?t=${t}`, fetchOptions),
        ]);
        const data = await productsRes.json();
        const mediaData = await mediaRes.json();
        const mediaAssets: MediaAsset[] = mediaData.data || [];
        
        if (data.data?.length > 0) {
          setProducts(data.data);
        } else {
          // Use media assets for product images
          const truckImages = mediaAssets.filter(m => m.category === 'product_truck' || m.category === '产品图片' || m.category === '产品-无人货车').map(m => m.url);
          const shuttleImages = mediaAssets.filter(m => m.category === 'product_vehicle' || m.category === '产品-行驶器无人车').map(m => m.url);
          
          const defaultWithImages = defaultProducts.map(p => ({
            ...p,
            images: p.category === 'truck' 
              ? (truckImages.length > 0 ? truckImages : [])
              : (shuttleImages.length > 0 ? shuttleImages : []),
          }));
          setProducts(defaultWithImages);
        }
      } catch {
        setProducts(defaultProducts);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
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
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">产品中心</h1>
          <p className="text-lg text-white/60 max-w-2xl">
            自主研发的L4级自动驾驶产品线，覆盖货运与出行两大核心场景
          </p>
        </div>
      </section>

      {/* Products */}
      {products.map((product, idx) => {
        const Icon = iconMap[product.category] || Truck;
        const specs = product.specs && typeof product.specs === 'object' ? product.specs : {};
        return (
          <section
            key={product.id}
            className={`py-20 lg:py-28 ${idx % 2 === 0 ? 'bg-white' : 'bg-surface'}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Product header */}
              <div className="flex items-center gap-4 mb-12">
                <div className="w-14 h-14 rounded-xl bg-navy/5 flex items-center justify-center">
                  <Icon className="w-7 h-7 text-navy" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-navy">{product.name}</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Image gallery */}
                <div>
                  <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-navy/5 to-brand-blue/5 border border-border/50 flex items-center justify-center mb-4 overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Icon className="w-16 h-16 text-navy/20 mx-auto mb-2" />
                        <span className="text-sm text-muted-foreground">产品高清图片</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg bg-navy/3 border border-border/30 flex items-center justify-center overflow-hidden"
                      >
                        {product.images && product.images[i] ? (
                          <img src={product.images[i]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground/50">图{i}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div>
                  <p className="text-foreground/80 leading-relaxed mb-8">{product.description}</p>

                  {/* Specs */}
                  {Object.keys(specs).length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-navy mb-4">基础参数</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(specs).map(([label, value]) => (
                          <div key={label} className="bg-surface rounded-lg p-3 border border-border/30">
                            <div className="text-xs text-muted-foreground mb-1">{label}</div>
                            <div className="text-sm font-medium text-navy">{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* B-side scenarios */}
                  {product.b_scenarios && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-navy mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-blue" />
                        B端适用场景
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{product.b_scenarios}</p>
                    </div>
                  )}

                  {/* C-side scenarios */}
                  {product.c_scenarios && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-navy mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-cyan" />
                        C端使用场景
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{product.c_scenarios}</p>
                    </div>
                  )}

                  <Link
                    href="/contact?tab=enterprise"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-md font-medium hover:bg-brand-blue-light transition-colors"
                  >
                    咨询此产品 <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
