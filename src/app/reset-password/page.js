'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { resetPassword } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email) {
            setError('Please enter your email address.');
            return;
        }

        setSubmitting(true);
        const { error: err } = await resetPassword(email);
        setSubmitting(false);

        if (err) {
            setError(err.message);
        } else {
            setSuccess('Password reset link sent! Check your email inbox (and spam folder).');
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.brand}>
                    <div style={styles.brandIcon}>🐔</div>
                    <h1 style={styles.brandTitle}>FarmFlow</h1>
                    <p style={styles.brandSub}>Broiler Farm Management</p>
                </div>

                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Reset Password</h2>
                    <p style={styles.cardSub}>
                        Enter your email and we'll send you a link to reset your password
                    </p>

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
                                <><Loader2 size={18} className="spinner" /> Sending...</>
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>
                    </form>

                    <p style={styles.toggleText}>
                        <button type="button" onClick={() => router.push('/login')} style={styles.backBtn}>
                            <ArrowLeft size={14} /> Back to sign in
                        </button>
                    </p>
                </div>

                <p style={styles.footer}>© {new Date().getFullYear()} FarmFlow</p>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: '24px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    container: { width: '100%', maxWidth: '420px', textAlign: 'center' },
    brand: { marginBottom: '32px' },
    brandIcon: { fontSize: '48px', marginBottom: '8px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' },
    brandTitle: { fontSize: '28px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px', margin: '0 0 4px 0' },
    brandSub: { fontSize: '14px', color: '#94a3b8', margin: 0, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' },
    card: { background: '#ffffff', borderRadius: '16px', padding: '36px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    cardTitle: { fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' },
    cardSub: { fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' },
    alert: {
        display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px 14px', borderRadius: '10px',
        background: '#fef2f2', color: '#dc2626', fontSize: '13px', marginBottom: '16px', textAlign: 'left', lineHeight: '1.4',
    },
    alertSuccess: {
        display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px 14px', borderRadius: '10px',
        background: '#f0fdf4', color: '#16a34a', fontSize: '13px', marginBottom: '16px', textAlign: 'left', lineHeight: '1.4',
    },
    form: { display: 'flex', flexDirection: 'column', gap: '16px' },
    fieldGroup: { textAlign: 'left' },
    label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' },
    inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
    inputIcon: { position: 'absolute', left: '14px', color: '#94a3b8', pointerEvents: 'none' },
    input: {
        width: '100%', padding: '12px 14px 12px 40px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
        fontSize: '14px', color: '#0f172a', outline: 'none', transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        background: '#f8fafc', boxSizing: 'border-box',
    },
    submitBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
        background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff',
        fontSize: '15px', fontWeight: 600, letterSpacing: '-0.2px', transition: 'all 0.2s ease', marginTop: '4px',
    },
    toggleText: { fontSize: '13px', color: '#64748b', marginTop: '20px', marginBottom: 0 },
    backBtn: {
        background: 'none', border: 'none', color: '#16a34a', fontWeight: 600, cursor: 'pointer',
        fontSize: '13px', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '4px',
    },
    footer: { fontSize: '12px', color: '#475569', marginTop: '24px' },
};
