'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    Bird,
    Warehouse,
    DollarSign,
    BarChart3,
    Calendar,
    Users,
    X,
    Moon,
    Sun,
    ChevronsLeft,
    ChevronsRight,
    LogOut
} from 'lucide-react';

const navItems = [
    {
        section: 'Overview',
        items: [
            { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        ]
    },
    {
        section: 'Management',
        items: [
            { href: '/batches', label: 'Batches', icon: Bird },
            { href: '/inventory', label: 'Feed & Inventory', icon: Warehouse },
            { href: '/schedule', label: 'Health Schedule', icon: Calendar },
        ]
    },
    {
        section: 'Finance',
        items: [
            { href: '/finances', label: 'Income & Expenses', icon: DollarSign },
            { href: '/customers', label: 'Customers', icon: Users },
            { href: '/reports', label: 'Reports', icon: BarChart3 },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isOpen, isCollapsed, close, toggleCollapse } = useSidebar();
    const { signOut } = useAuth();
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('farm_theme');
        const prefersDark = saved === 'dark';
        setIsDark(prefersDark);
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }, []);

    const toggleTheme = () => {
        const newTheme = isDark ? 'light' : 'dark';
        setIsDark(!isDark);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('farm_theme', newTheme);
    };

    return (
        <>
            {isOpen && <div className="sidebar-backdrop" onClick={close} />}
            <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">🐔</div>
                    {!isCollapsed && (
                        <div className="sidebar-brand-text">
                            <h1>FarmFlow</h1>
                            <span>Broiler Management</span>
                        </div>
                    )}
                    <button className="sidebar-close" onClick={close}>
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((section) => (
                        <div key={section.section}>
                            {!isCollapsed && <div className="sidebar-section-title">{section.section}</div>}
                            {isCollapsed && <div className="sidebar-section-divider" />}
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`nav-link ${isActive ? 'active' : ''}`}
                                        onClick={close}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <Icon className="nav-icon" size={20} />
                                        {!isCollapsed && <span className="nav-label">{item.label}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        {!isCollapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
                    </button>
                    <button
                        className="collapse-toggle"
                        onClick={toggleCollapse}
                        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
                        {!isCollapsed && <span>Collapse</span>}
                    </button>
                    <button
                        className="collapse-toggle"
                        onClick={async () => { await signOut(); router.replace('/login'); }}
                        title="Sign out"
                        style={{ color: 'var(--red-400, #f87171)' }}
                    >
                        <LogOut size={18} />
                        {!isCollapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>
            <style jsx>{`
        .sidebar-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 99;
          backdrop-filter: blur(4px);
        }
        .sidebar-close {
          display: none;
          margin-left: auto;
          background: none;
          border: none;
          color: var(--slate-400);
          cursor: pointer;
          padding: 4px;
        }
        .sidebar-brand-text {
          overflow: hidden;
          white-space: nowrap;
        }
        .sidebar-section-divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 8px 12px;
        }
        .nav-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .collapse-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          border: none;
          background: none;
          color: var(--slate-500);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms ease;
          margin-top: 4px;
        }
        .collapse-toggle:hover {
          background: rgba(255,255,255,0.06);
          color: var(--slate-300);
        }
        @media (max-width: 768px) {
          .sidebar-backdrop { display: block; }
          .sidebar-close { display: block; }
          .collapse-toggle { display: none; }
        }
      `}</style>
        </>
    );
}
