import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { FloatingButtons } from '@/components/FloatingButtons';

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: '车领驭 | 共享无人车 - 无人货车销售·租赁·运力一体化解决方案',
  description: '车领驭共享无人车，专注无人车销售、租赁与运力服务，覆盖封闭园区、厂区、物流干线、个人多元化用车场景。',
  keywords: ['无人车', '共享无人车', '无人货车', '自动驾驶', '车辆租赁', '运力服务'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingButtons />
      </body>
    </html>
  );
}
