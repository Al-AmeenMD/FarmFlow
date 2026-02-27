'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { Loader2 } from 'lucide-react';
import './globals.css';

function AppShell({ children }) {
  const { isCollapsed } = useSidebar();
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage = pathname === '/login' || pathname === '/reset-password' || pathname === '/update-password';

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.replace('/login');
    }
  }, [loading, user, isAuthPage, router]);

  // Loading auth state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary, #f1f5f9)' }}>
        <Loader2 size={36} className="spinner" style={{ color: 'var(--primary, #16a34a)' }} />
      </div>
    );
  }

  // Auth pages — no sidebar
  if (isAuthPage) {
    return children;
  }

  // Not authenticated — don't render (redirect in useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className={`app-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>FarmFlow — Broiler Farm Management</title>
        <meta name="description" content="Manage your broiler farm with ease. Track batches, feed, finances, and performance metrics." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <SidebarProvider>
            <AppShell>{children}</AppShell>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
