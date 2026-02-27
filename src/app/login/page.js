'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
    const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { signIn, signUp } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }

        if (mode === 'signup') {
            if (password.length < 6) {
                setError('Password must be at least 6 characters.');
                return;
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match.');
                return;
            }
        }

        setSubmitting(true);

        if (mode === 'signin') {
            const { error: err } = await signIn(email, password);
            if (err) {
                setError(err.message === 'Invalid login credentials'
                    ? 'Invalid email or password. Please try again.'
                    : err.message);
                setSubmitting(false);
            } else {
                router.push('/');
            }
        } else {
            const { data, error: err } = await signUp(email, password);
            if (err) {
                setError(err.message);
                setSubmitting(false);
            } else if (data?.user?.identities?.length === 0) {
                setError('An account with this email already exists.');
                setSubmitting(false);
            } else {
                setSuccess('Account created! Check your email to confirm, then sign in.');
                setMode('signin');
                setPassword('');
                setConfirmPassword('');
                setSubmitting(false);
            }
        }
    };

    const switchMode = () => {
        setMode(mode === 'signin' ? 'signup' : 'signin');
        setError('');
        setSuccess('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* Branding */}
                <div style={styles.brand}>
                    <div style={styles.brandIcon}>🐔</div>
                    <h1 style={styles.brandTitle}>FarmFlow</h1>
                    <p style={styles.brandSub}>Broiler Farm Management</p>
                </div>

                {/* Card */}
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>
                        {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p style={styles.cardSub}>
                        {mode === 'signin'
                            ? 'Sign in to access your farm dashboard'
                            : 'Set up your account to start managing your farm'}
                    </p>

                    {/* Messages */}
                    {error && (
                        <div style={styles.alert}>
                            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                            <span>{error}</span>
                        </div>
                    )}
                    {success && (
                        <div style={styles.alertSuccess}>
                            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                            <span>{success}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Email</label>
                            <div style={styles.inputWrap}>
                                <Mail size={16} style={styles.inputIcon} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    style={styles.input}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Password</label>
                            <div style={styles.inputWrap}>
                                <Lock size={16} style={styles.inputIcon} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                                    style={styles.input}
                                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={styles.eyeBtn}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {mode === 'signup' && (
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Confirm Password</label>
                                <div style={styles.inputWrap}>
                                    <Lock size={16} style={styles.inputIcon} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter password"
                                        style={styles.input}
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                ...styles.submitBtn,
                                opacity: submitting ? 0.7 : 1,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {submitting ? (
                                <><Loader2 size={18} className="spinner" /> {mode === 'signin' ? 'Signing in...' : 'Creating account...'}</>
                            ) : (
                                mode === 'signin' ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Forgot password link */}
                    {mode === 'signin' && (
                        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px', marginBottom: 0 }}>
                            <button
                                type="button"
                                onClick={() => router.push('/reset-password')}
                                style={styles.toggleBtn}
                            >
                                Forgot your password?
                            </button>
                        </p>
                    )}

                    {/* Toggle */}
                    <p style={styles.toggleText}>
                        {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                        <button type="button" onClick={switchMode} style={styles.toggleBtn}>
                            {mode === 'signin' ? 'Create one' : 'Sign in'}
                        </button>
                    </p>
                </div>

                <p style={styles.footer}>
                    © {new Date().getFullYear()} FarmFlow
                </p>
            </div>
        </div>
    );
}

// ── Inline styles (standalone page, no sidebar CSS) ──────────────────────────

const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: '24px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    container: {
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
    },
    brand: { marginBottom: '32px' },
    brandIcon: {
        fontSize: '48px',
        marginBottom: '8px',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
    },
    brandTitle: {
        fontSize: '28px',
        fontWeight: 800,
        color: '#f8fafc',
        letterSpacing: '-0.5px',
        margin: '0 0 4px 0',
    },
    brandSub: {
        fontSize: '14px',
        color: '#94a3b8',
        margin: 0,
        fontWeight: 500,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
    },
    card: {
        background: '#ffffff',
        borderRadius: '16px',
        padding: '36px 32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    },
    cardTitle: {
        fontSize: '22px',
        fontWeight: 700,
        color: '#0f172a',
        margin: '0 0 6px 0',
    },
    cardSub: {
        fontSize: '13px',
        color: '#64748b',
        margin: '0 0 24px 0',
    },
    alert: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '12px 14px',
        borderRadius: '10px',
        background: '#fef2f2',
        color: '#dc2626',
        fontSize: '13px',
        marginBottom: '16px',
        textAlign: 'left',
        lineHeight: '1.4',
    },
    alertSuccess: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '12px 14px',
        borderRadius: '10px',
        background: '#f0fdf4',
        color: '#16a34a',
        fontSize: '13px',
        marginBottom: '16px',
        textAlign: 'left',
        lineHeight: '1.4',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    fieldGroup: {
        textAlign: 'left',
    },
    label: {
        display: 'block',
        fontSize: '13px',
        fontWeight: 600,
        color: '#334155',
        marginBottom: '6px',
    },
    inputWrap: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: '14px',
        color: '#94a3b8',
        pointerEvents: 'none',
    },
    input: {
        width: '100%',
        padding: '12px 14px 12px 40px',
        border: '1.5px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        color: '#0f172a',
        outline: 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        background: '#f8fafc',
        boxSizing: 'border-box',
    },
    eyeBtn: {
        position: 'absolute',
        right: '12px',
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
    },
    submitBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '13px',
        borderRadius: '10px',
        border: 'none',
        background: 'linear-gradient(135deg, #16a34a, #15803d)',
        color: '#fff',
        fontSize: '15px',
        fontWeight: 600,
        letterSpacing: '-0.2px',
        transition: 'all 0.2s ease',
        marginTop: '4px',
    },
    toggleText: {
        fontSize: '13px',
        color: '#64748b',
        marginTop: '20px',
        marginBottom: 0,
    },
    toggleBtn: {
        background: 'none',
        border: 'none',
        color: '#16a34a',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '13px',
        padding: 0,
    },
    footer: {
        fontSize: '12px',
        color: '#475569',
        marginTop: '24px',
    },
};
