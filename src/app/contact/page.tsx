import { Suspense } from 'react';
import ContactContent from './contact-content';

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="text-gray-400">加载中...</div></div>}>
      <ContactContent />
    </Suspense>
  );
}
