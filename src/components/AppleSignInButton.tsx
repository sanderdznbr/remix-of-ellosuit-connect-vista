import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { isAppleSignInCancellation, signInWithApple } from '@/lib/appleAuth';

interface AppleSignInButtonProps {
  disabled?: boolean;
  onError: (message: string) => void;
}

export function AppleSignInButton({ disabled = false, onError }: AppleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    onError('');

    try {
      await signInWithApple();
    } catch (error) {
      if (!isAppleSignInCancellation(error)) {
        const message = error instanceof Error ? error.message : 'Não foi possível entrar com a Apple.';
        onError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={disabled || loading}
      aria-label="Continuar com a Apple"
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-white px-4 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <span className="text-xl leading-none" aria-hidden="true"></span>
      )}
      Continuar com a Apple
    </button>
  );
}
