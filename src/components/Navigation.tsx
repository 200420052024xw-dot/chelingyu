'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: '首页', href: '/' },
  { label: '产品中心', href: '/products' },
  { label: '业务服务', href: '/services' },
  { label: '项目案例', href: '/cases' },
  { label: '关于我们', href: '/about' },
  { label: '联系咨询', href: '/contact' },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [siteName, setSiteName] = useState('车领驭');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.data?.site_name) {
          setSiteName(data.data.site_name);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/90 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-navy tracking-tight">{siteName}</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                pathname === item.href
                  ? 'text-brand-blue bg-accent'
                  : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-foreground/70 hover:text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-border/50 shadow-lg">
          <nav className="flex flex-col p-4 gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'px-4 py-3 text-sm font-medium rounded-md transition-colors',
                  pathname === item.href
                    ? 'text-brand-blue bg-accent'
                    : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
