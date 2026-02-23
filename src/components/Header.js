'use client';

import { Menu, Calendar } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';

export default function Header({ title, subtitle, children }) {
    const { toggle } = useSidebar();
    const { user } = useAuth();

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const initial = user?.email ? user.email.charAt(0).toUpperCase() : '?';

    return (
        <header className="header">
            <div className="header-left">
                <button className="mobile-menu-btn" onClick={toggle}>
                    <Menu size={24} />
                </button>
                <div className="header-text">
                    <h1 className="header-title">{title}</h1>
                    {subtitle && <p className="header-subtitle">{subtitle}</p>}
                </div>
            </div>
            <div className="header-actions">
                <div className="header-date">
                    <Calendar size={13} style={{ marginRight: '6px', verticalAlign: '-1px' }} />
                    {dateStr}
                </div>
                <div className="header-avatar" title={user?.email || 'User'}>
                    {initial}
                </div>
                {children}
            </div>
        </header>
    );
}

