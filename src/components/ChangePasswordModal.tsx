import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './LandingPage.css';

interface ChangePasswordModalProps {
    onClose: () => void;
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                setError(updateError.message);
            } else {
                setSuccess('Contraseña actualizada correctamente.');
                setTimeout(() => onClose(), 1500);
            }
        } catch {
            setError('Error de conexión. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-overlay" onClick={onClose}>
            <div className="change-pw-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="change-pw-title">Cambiar Contraseña</h2>

                <form onSubmit={handleSubmit}>
                    {error && <div className="login-error">{error}</div>}
                    {success && <div className="change-pw-success">{success}</div>}

                    <div className="change-pw-field">
                        <label className="change-pw-label" htmlFor="new-password">Nueva Contraseña</label>
                        <input
                            id="new-password"
                            className="change-pw-input"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="change-pw-field">
                        <label className="change-pw-label" htmlFor="confirm-password">Confirmar Contraseña</label>
                        <input
                            id="confirm-password"
                            className="change-pw-input"
                            type="password"
                            placeholder="Repita la contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="change-pw-submit"
                        disabled={loading || !newPassword || !confirmPassword}
                    >
                        {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                </form>

                <button className="change-pw-cancel" onClick={onClose}>
                    Cancelar
                </button>
            </div>
        </div>
    );
}
