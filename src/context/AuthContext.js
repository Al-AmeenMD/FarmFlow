'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import { checkIsAdmin } from '@/lib/admin-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const supabase = getSupabase();
        if (!supabase) {
            setLoading(false);
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user) {
                checkIsAdmin().then(setIsAdmin);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                checkIsAdmin().then(setIsAdmin);
            } else {
                setIsAdmin(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = useCallback(async (email, password) => {
        const supabase = getSupabase();
        if (!supabase) return { error: { message: 'Supabase not configured' } };
        const { data, error } = await supabase.auth.signUp({ email, password });
        return { data, error };
    }, []);

    const signIn = useCallback(async (email, password) => {
        const supabase = getSupabase();
        if (!supabase) return { error: { message: 'Supabase not configured' } };
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { data, error };
    }, []);

    const signOut = useCallback(async () => {
        const supabase = getSupabase();
        if (!supabase) return;
        await supabase.auth.signOut();
        setUser(null);
    }, []);

    const resetPassword = useCallback(async (email) => {
        const supabase = getSupabase();
        if (!supabase) return { error: { message: 'Supabase not configured' } };
        const siteUrl = window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || '');
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${siteUrl}/update-password`,
        });
        return { data, error };
    }, []);

    const updatePassword = useCallback(async (newPassword) => {
        const supabase = getSupabase();
        if (!supabase) return { error: { message: 'Supabase not configured' } };
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        return { data, error };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, signUp, signIn, signOut, resetPassword, updatePassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
