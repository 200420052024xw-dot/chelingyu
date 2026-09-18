'use client';

import Link from 'next/link';
import { MessageSquare, Calendar, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';

export function FloatingButtons() {
  const [phone, setPhone] = useState('4008889999');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.data?.phone) {
          // Remove non-numeric characters for tel: link
          setPhone(data.data.phone.replace(/[^0-9]/g, ''));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="fixed right-4 lg:right-6 bottom-8 z-40 flex flex-col gap-3">
      {/* Enterprise consultation */}
      <Link
        href="/contact?type=enterprise"
        className="group flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-lg shadow-lg hover:shadow-xl hover:bg-brand-blue-light transition-all duration-300 text-sm font-medium"
        title="企业合作咨询"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden lg:inline">企业咨询</span>
      </Link>

      {/* Personal booking */}
      <Link
        href="/contact?type=personal"
        className="group flex items-center gap-2 px-4 py-2.5 bg-navy text-white rounded-lg shadow-lg hover:shadow-xl hover:bg-navy-light transition-all duration-300 text-sm font-medium"
        title="个人预约体验"
      >
        <Calendar className="w-4 h-4" />
        <span className="hidden lg:inline">个人预约</span>
      </Link>

      {/* Phone */}
      <a
        href={`tel:${phone}`}
        className="group flex items-center gap-2 px-4 py-2.5 bg-brand-cyan text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-sm font-medium"
        title="一键拨打电话"
      >
        <Phone className="w-4 h-4" />
        <span className="hidden lg:inline">电话咨询</span>
      </a>
    </div>
  );
}
