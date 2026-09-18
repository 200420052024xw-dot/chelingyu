'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  FileText,
  Image,
  Settings,
  MessageSquare,
  Layers,
  LogIn,
  Truck,
  Home,
  Package,
  Briefcase,
  Award,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LeadsPanel } from './leads-panel';
import { SettingsPanel } from './settings-panel';
import ContentPanel from './content-panel';
import { MediaPanel } from './media-panel';
import { PagesPanel } from './pages-panel';
import { StylePanel } from './style-panel';
import { HomepagePanel } from './homepage-panel';
import { ProductsPanel } from './products-panel';
import { ServicesPanel } from './services-panel';
import { CasesPanel } from './cases-panel';
import { AboutPanel } from './about-panel';

type AdminTab = 'leads' | 'settings' | 'homepage' | 'products' | 'services' | 'cases' | 'about' | 'content' | 'media' | 'pages' | 'style';

const tabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'leads', label: '留言管理', icon: MessageSquare },
  { id: 'settings', label: '全局设置', icon: Settings },
  { id: 'homepage', label: '首页管理', icon: Home },
  { id: 'products', label: '产品中心', icon: Package },
  { id: 'services', label: '业务服务', icon: Briefcase },
  { id: 'cases', label: '项目案例', icon: Award },
  { id: 'about', label: '关于我们', icon: Users },
  { id: 'content', label: '内容编辑', icon: FileText },
  { id: 'media', label: '素材管理', icon: Image },
  { id: 'pages', label: '页面管理', icon: Layers },
  { id: 'style', label: '样式设置', icon: LayoutDashboard },
];

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('leads');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'chelingyu2024') {
      setAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('账号或密码错误');
    }
  };

  const renderPanel = useCallback(() => {
    switch (activeTab) {
      case 'leads':
        return <LeadsPanel />;
      case 'settings':
        return <SettingsPanel />;
      case 'homepage':
        return <HomepagePanel />;
      case 'products':
        return <ProductsPanel />;
      case 'services':
        return <ServicesPanel />;
      case 'cases':
        return <CasesPanel />;
      case 'about':
        return <AboutPanel />;
      case 'content':
        return <ContentPanel />;
      case 'media':
        return <MediaPanel />;
      case 'pages':
        return <PagesPanel />;
      case 'style':
        return <StylePanel />;
      default:
        return <LeadsPanel />;
    }
  }, [activeTab]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-navy flex items-center justify-center mx-auto mb-4">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-navy">车领驭后台管理</h1>
            <p className="text-sm text-muted-foreground mt-1">请登录以管理网站内容</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-xl border border-border/50 p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1.5">账号</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  placeholder="请输入管理员账号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1.5">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  placeholder="请输入密码"
                />
              </div>
              {loginError && (
                <p className="text-sm text-destructive">{loginError}</p>
              )}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-md font-medium hover:bg-brand-blue-light transition-colors"
              >
                <LogIn className="w-4 h-4" />
                登录
              </button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            默认账号: admin / 密码: chelingyu2024
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 bg-navy text-white transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-56' : 'w-16'
        )}
      >
        <div className="h-16 flex items-center gap-2.5 px-4 border-b border-white/10 shrink-0">
          <Truck className="w-6 h-6 shrink-0" />
          {sidebarOpen && <span className="font-bold text-sm">车领驭管理后台</span>}
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              <tab.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>{tab.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            {sidebarOpen ? '收起侧栏' : '展开'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn('flex-1 transition-all duration-300', sidebarOpen ? 'ml-56' : 'ml-16')}>
        <header className="h-16 bg-white border-b border-border/50 flex items-center px-6 sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-navy">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              查看网站
            </Link>
            <button
              onClick={() => setAuthenticated(false)}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              退出登录
            </button>
          </div>
        </header>
        <main className="p-6">{renderPanel()}</main>
      </div>
    </div>
  );
}
