import { useState } from 'react';
import { RefreshCw, Replace } from 'lucide-react';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning',
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
    const [closing, setClosing] = useState(false);

    const handleClose = (confirmed: boolean) => {
        setClosing(true);
        setTimeout(() => {
            if (confirmed) onConfirm();
            else onCancel();
        }, 200);
    };

    const iconColor = type === 'danger' ? '#dc2626' : '#f59e0b';
    const confirmBg = type === 'danger'
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-emerald-600 hover:bg-emerald-700';

    return (
        <div
            className={`confirm-overlay ${closing ? 'confirm-overlay-exit' : ''}`}
            onClick={() => handleClose(false)}
        >
            <div
                className={`confirm-dialog ${closing ? 'confirm-dialog-exit' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="confirm-icon-wrapper">
                    {type === 'danger' ? (
                        <RefreshCw size={28} color={iconColor} />
                    ) : (
                        <Replace size={28} color={iconColor} />
                    )}
                </div>
                <h3 className="confirm-title">{title}</h3>
                <p className="confirm-message">{message}</p>
                <div className="confirm-actions">
                    <button
                        className="confirm-btn confirm-btn-cancel"
                        onClick={() => handleClose(false)}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`confirm-btn confirm-btn-ok ${confirmBg}`}
                        onClick={() => handleClose(true)}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper to use ConfirmDialog as a Promise (like window.confirm but async)
let resolveConfirm: ((value: boolean) => void) | null = null;
let setConfirmState: ((state: ConfirmDialogState | null) => void) | null = null;

interface ConfirmDialogState {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger';
}

export function showConfirm(options: ConfirmDialogState): Promise<boolean> {
    return new Promise((resolve) => {
        resolveConfirm = resolve;
        if (setConfirmState) {
            setConfirmState(options);
        }
    });
}

export function useConfirmDialog() {
    const [state, setState] = useState<ConfirmDialogState | null>(null);
    setConfirmState = setState;

    const dialog = state ? (
        <ConfirmDialog
            title={state.title}
            message={state.message}
            confirmText={state.confirmText}
            cancelText={state.cancelText}
            type={state.type}
            onConfirm={() => {
                setState(null);
                resolveConfirm?.(true);
            }}
            onCancel={() => {
                setState(null);
                resolveConfirm?.(false);
            }}
        />
    ) : null;

    return dialog;
}
