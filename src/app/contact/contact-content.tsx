'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  User,
  MapPin,
  Phone,
  Mail,
  Send,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SiteSettings {
  site_name: string;
  phone: string;
  email: string;
  address: string;
  wechat_qrcode: string;
  copyright: string;
}

export default function ContactContent() {
  const [activeForm, setActiveForm] = useState<'enterprise' | 'personal'>('enterprise');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: '车领驭',
    phone: '400-888-9999',
    email: 'contact@chelingyu.com',
    address: '上海市浦东新区张江高科技园区',
    wechat_qrcode: '',
    copyright: '',
  });

  // Fetch settings from API
  useEffect(() => {
    const t = Date.now();
    fetch(`/api/settings?t=${t}`, { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.data?.site_name) {
          setSettings(prev => ({ ...prev, ...data.data }));
        }
      })
      .catch(() => {});
  }, []);

  // Read URL params on client side only to avoid SSR issues
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type');
    if (typeParam === 'personal') {
      setActiveForm('personal');
    }
  }, []);

  // Enterprise form
  const [entForm, setEntForm] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    scenario: '',
    message: '',
  });

  // Personal form
  const [perForm, setPerForm] = useState({
    name: '',
    phone: '',
    intention: '租赁',
    planned_time: '',
    message: '',
  });

  const handleEnterpriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'enterprise', ...entForm }),
      });
      if (!res.ok) throw new Error('提交失败');
      setSubmitted(true);
    } catch {
      alert('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'personal', ...perForm }),
      });
      if (!res.ok) throw new Error('提交失败');
      setSubmitted(true);
    } catch {
      alert('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="pt-16">
        <section className="py-32 bg-white">
          <div className="max-w-md mx-auto px-4 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-navy mb-3">提交成功</h2>
            <p className="text-muted-foreground mb-8">
              我们已收到您的信息，工作人员将在1个工作日内与您联系。
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setEntForm({ company_name: '', contact_person: '', phone: '', scenario: '', message: '' });
                setPerForm({ name: '', phone: '', intention: '租赁', planned_time: '', message: '' });
              }}
              className="px-6 py-2.5 bg-brand-blue text-white rounded-md text-sm font-medium hover:bg-brand-blue-light transition-colors"
            >
              继续提交
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pt-16">
      {/* Header */}
      <section className="py-20 lg:py-28 bg-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">联系咨询</h1>
          <p className="text-lg text-white/60 max-w-2xl">
            无论您是企业客户还是个人用户，我们都期待与您的沟通
          </p>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Forms */}
            <div className="lg:col-span-2">
              {/* Tab switcher */}
              <div className="flex gap-2 mb-8 border-b border-border pb-1">
                <button
                  onClick={() => setActiveForm('enterprise')}
                  className={cn(
                    'flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-md transition-colors -mb-px border-b-2',
                    activeForm === 'enterprise'
                      ? 'text-brand-blue border-brand-blue'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  )}
                >
                  <Building2 className="w-4 h-4" />
                  企业合作咨询
                </button>
                <button
                  onClick={() => setActiveForm('personal')}
                  className={cn(
                    'flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-md transition-colors -mb-px border-b-2',
                    activeForm === 'personal'
                      ? 'text-brand-cyan border-brand-cyan'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  )}
                >
                  <User className="w-4 h-4" />
                  个人预约登记
                </button>
              </div>

              {/* Enterprise Form */}
              {activeForm === 'enterprise' && (
                <form onSubmit={handleEnterpriseSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-1.5">
                        公司名称 <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={entForm.company_name}
                        onChange={(e) => setEntForm({ ...entForm, company_name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors"
                        placeholder="请输入公司全称"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-1.5">
                        对接人 <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={entForm.contact_person}
                        onChange={(e) => setEntForm({ ...entForm, contact_person: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors"
                        placeholder="请输入您的姓名"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1.5">
                      联系电话 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={entForm.phone}
                      onChange={(e) => setEntForm({ ...entForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors"
                      placeholder="请输入联系电话"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1.5">
                      项目场景
                    </label>
                    <select
                      value={entForm.scenario}
                      onChange={(e) => setEntForm({ ...entForm, scenario: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors"
                    >
                      <option value="">请选择项目场景</option>
                      <option value="物流园区">物流园区</option>
                      <option value="制造工厂">制造工厂</option>
                      <option value="港口码头">港口码头</option>
                      <option value="城市配送">城市配送</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1.5">
                      需求描述
                    </label>
                    <textarea
                      rows={4}
                      value={entForm.message}
                      onChange={(e) => setEntForm({ ...entForm, message: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors resize-none"
                      placeholder="请描述您的具体需求，如车辆数量、使用场景、预期时间等"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-brand-blue text-white rounded-md font-medium hover:bg-brand-blue-light transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? '提交中...' : '提交咨询'}
                  </button>
                </form>
              )}

              {/* Personal Form */}
              {activeForm === 'personal' && (
                <form onSubmit={handlePersonalSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-1.5">
                        姓名 <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={perForm.name}
                        onChange={(e) => setPerForm({ ...perForm, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan transition-colors"
                        placeholder="请输入您的姓名"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-1.5">
                        手机号 <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={perForm.phone}
                        onChange={(e) => setPerForm({ ...perForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan transition-colors"
                        placeholder="请输入手机号"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-1.5">
                        意向 <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={perForm.intention}
                        onChange={(e) => setPerForm({ ...perForm, intention: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan transition-colors"
                      >
                        <option value="租赁">租赁</option>
                        <option value="购买">购买</option>
                        <option value="体验">体验</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-1.5">
                        计划用车时间
                      </label>
                      <input
                        type="date"
                        value={perForm.planned_time}
                        onChange={(e) => setPerForm({ ...perForm, planned_time: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1.5">留言</label>
                    <textarea
                      rows={4}
                      value={perForm.message}
                      onChange={(e) => setPerForm({ ...perForm, message: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan transition-colors resize-none"
                      placeholder="请输入您的留言或特殊需求"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-brand-cyan text-white rounded-md font-medium hover:bg-brand-cyan/90 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? '提交中...' : '提交预约'}
                  </button>
                </form>
              )}
            </div>

            {/* Contact Info Sidebar */}
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-navy mb-4">联系方式</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-brand-blue mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-navy">服务热线</div>
                      <div className="text-sm text-muted-foreground">{settings.phone}</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-brand-blue mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-navy">电子邮箱</div>
                      <div className="text-sm text-muted-foreground">{settings.email}</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-brand-blue mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-navy">公司地址</div>
                      <div className="text-sm text-muted-foreground">
                        {settings.address}
                      </div>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Map placeholder */}
              <div>
                <h3 className="text-lg font-semibold text-navy mb-4">公司位置</h3>
                <div className="aspect-[4/3] rounded-xl bg-surface border border-border/50 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-navy/20 mx-auto mb-2" />
                    <span className="text-xs text-muted-foreground">高德地图嵌入位</span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div>
                <h3 className="text-lg font-semibold text-navy mb-4">微信咨询</h3>
                {settings.wechat_qrcode ? (
                  <img src={settings.wechat_qrcode} alt="微信二维码" className="w-32 h-32 rounded-xl object-cover border border-border/50" />
                ) : (
                  <div className="w-32 h-32 rounded-xl bg-surface border border-border/50 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground text-center">微信二维码</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
