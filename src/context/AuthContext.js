'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
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

    return (
        <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
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
