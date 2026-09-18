'use client';

import Link from 'next/link';
import { Truck, MapPin, Phone, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Footer() {
  const [settings, setSettings] = useState({
    site_name: '车领驭',
    company_name: '车领驭科技有限公司',
    phone: '400-888-9999',
    email: 'contact@chelingyu.com',
    address: '上海市浦东新区张江高科技园区',
    copyright: '车领驭科技有限公司 版权所有',
    wechat_qrcode: '',
  });

  useEffect(() => {
    // Add timestamp to bust any cache
    const timestamp = Date.now();
    fetch(`/api/settings?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setSettings(prev => ({ ...prev, ...data.data }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="bg-navy text-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">{settings.site_name}</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              共享无人车<br />
              专注无人车销售、租赁与运力服务
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">快速导航</h3>
            <ul className="space-y-2.5">
              {[
                { label: '产品中心', href: '/products' },
                { label: '业务服务', href: '/services' },
                { label: '项目案例', href: '/cases' },
                { label: '关于我们', href: '/about' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">联系我们</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 text-white/40 shrink-0" />
                <span className="text-sm text-white/60">{settings.address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-white/40 shrink-0" />
                <span className="text-sm text-white/60">{settings.phone}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-white/40 shrink-0" />
                <span className="text-sm text-white/60">{settings.email}</span>
              </li>
            </ul>
          </div>

          {/* QR Code */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">关注我们</h3>
            <div className="w-24 h-24 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
              {settings.wechat_qrcode ? (
                <img src={settings.wechat_qrcode} alt="微信二维码" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-white/40 text-center">微信二维码</span>
              )}
            </div>
            {settings.wechat_qrcode && (
              <p className="text-xs text-white/40 mt-2">扫码关注公众号</p>
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            &copy; {new Date().getFullYear()} {settings.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
