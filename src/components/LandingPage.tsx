import { useState } from 'react';
import './LandingPage.css';

interface LandingPageProps {
    onLoginSuccess: () => void;
    onGuestAccess: () => void;
}

// Arauco tree logo SVG
const AraucoLogo = () => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Circle background */}
        <circle cx="50" cy="50" r="48" fill="#16a34a" />
        <circle cx="50" cy="50" r="42" fill="white" />
        <circle cx="50" cy="50" r="38" fill="#16a34a" />
        {/* Tree shape */}
        <polygon points="50,18 35,42 65,42" fill="white" />
        <polygon points="50,30 30,55 70,55" fill="white" />
        <polygon points="50,42 25,68 75,68" fill="white" />
        <rect x="45" y="65" width="10" height="14" fill="white" rx="2" />
    </svg>
);

// Shield check icon
const ShieldCheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

// Eye icon
const EyeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

// Arrow right icon
const ArrowRightIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

export function LandingPage({ onLoginSuccess, onGuestAccess }: LandingPageProps) {
    const [showLogin, setShowLogin] = useState(false);

    return (
        <div className="landing-page">
            {/* Logo */}
            <div className="landing-logo-container">
                <div className="landing-logo-circle">
                    <AraucoLogo />
                </div>
            </div>

            {/* Title */}
            <div className="landing-title">
                <span className="landing-title-arauco">ARAUCO </span>
                <span className="landing-title-l2">L-2</span>
            </div>

            <div className="landing-subtitle">MANTENCIÓN HCE</div>

            <p className="landing-description">
                Sistema Centralizado de Gestión y Control Térmico del Horno.
            </p>

            {/* Card */}
            <div className="landing-card">
                {/* Acceso Técnico */}
                <button
                    className="landing-btn landing-btn-tecnico"
                    onClick={() => setShowLogin(true)}
                    id="btn-acceso-tecnico"
                >
                    <span className="landing-btn-icon">
                        <ShieldCheckIcon />
                    </span>
                    <span className="landing-btn-text">
                        <span className="landing-btn-title">Acceso Técnico</span>
                        <span className="landing-btn-subtitle">REGISTRO DE INSPECCIONES</span>
                    </span>
                    <span className="landing-btn-arrow">
                        <ArrowRightIcon />
                    </span>
                </button>

                {/* Invitado */}
                <button
                    className="landing-btn landing-btn-invitado"
                    onClick={onGuestAccess}
                    id="btn-invitado"
                >
                    <span className="landing-btn-icon">
                        <EyeIcon />
                    </span>
                    <span className="landing-btn-text">
                        <span className="landing-btn-title">Invitado</span>
                        <span className="landing-btn-subtitle">CONSULTA DE TENDENCIAS</span>
                    </span>
                    <span className="landing-btn-arrow">
                        <ArrowRightIcon />
                    </span>
                </button>
            </div>

            {/* Footer */}
            <div className="landing-footer">
                <p className="landing-footer-dept">DEPARTAMENTO DE MANTENCIÓN</p>
            </div>

            {/* Created by */}
            <div className="landing-created-by">
                Created by Gilbert Retamal S.
            </div>

            {/* Login Modal */}
            {showLogin && (
                <LoginModal
                    onSuccess={onLoginSuccess}
                    onClose={() => setShowLogin(false)}
                />
            )}
        </div>
    );
}

/* ==================== Login Modal ==================== */
import { supabase } from '../lib/supabaseClient';

interface LoginModalProps {
    onSuccess: () => void;
    onClose: () => void;
}

function LoginModal({ onSuccess, onClose }: LoginModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (authError) {
                if (authError.message.includes('Invalid login credentials')) {
                    setError('Correo o contraseña incorrectos.');
                } else {
                    setError(authError.message);
                }
            } else {
                onSuccess();
            }
        } catch {
            setError('Error de conexión. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-overlay" onClick={onClose}>
            <div className="login-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="login-modal-title">Acceso Técnico</h2>
                <p className="login-modal-subtitle">Ingrese sus credenciales para continuar</p>

                <form onSubmit={handleSubmit}>
                    {error && <div className="login-error">{error}</div>}

                    <div className="login-field">
                        <label className="login-label" htmlFor="login-email">Correo Electrónico</label>
                        <input
                            id="login-email"
                            className="login-input"
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="login-field">
                        <label className="login-label" htmlFor="login-password">Contraseña</label>
                        <input
                            id="login-password"
                            className="login-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-submit-btn"
                        disabled={loading || !email || !password}
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <button className="login-cancel-btn" onClick={onClose}>
                    Volver
                </button>
            </div>
        </div>
    );
}
