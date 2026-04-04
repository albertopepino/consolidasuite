import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '@/api/hooks';
import { useAuthStore } from '@/store/authStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useTranslation } from '@/i18n/useTranslation';
import { LANGUAGES } from '@/i18n/translations';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loginMutation = useLogin();
  const { t } = useTranslation();
  const setLanguage = useDashboardStore((s) => s.setLanguage);
  const currentLang = useDashboardStore((s) => s.language);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync(data);
      navigate(from, { replace: true });
    } catch {
      // handled by mutation state
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(140deg, #062033 0%, #0c3a5f 30%, #1a6fb5 55%, #3a9d6a 80%, #2d8a4e 100%)',
          backgroundSize: '300% 300%',
          animation: 'gradientShift 20s ease infinite',
        }}
      />
      <div className="absolute inset-0 -z-10 opacity-20" style={{
        background: 'radial-gradient(circle at 30% 20%, rgba(26,111,181,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(92,184,92,0.3) 0%, transparent 50%)',
      }} />
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Card */}
      <div className="w-full max-w-[440px] animate-scale-in" style={{ animationFillMode: 'backwards' }}>
        {/* Logo - big and centered */}
        <div className="mb-10 flex justify-center">
          <img
            src="/logo.png"
            alt="ConsolidaSuite"
            className="h-20 w-auto drop-shadow-[0_4px_24px_rgba(255,255,255,0.15)]"
          />
        </div>

        {/* Form card */}
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_32px_64px_rgba(0,0,0,0.3)]">
          <div className="mb-7">
            <h1 className="text-[26px] font-bold text-white font-display tracking-tight">
              {t('login.welcome')}
            </h1>
            <p className="mt-1.5 text-[14px] text-white/40">
              {t('login.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-white/40">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-[14px] text-white placeholder:text-white/25 focus:border-white/20 focus:bg-white/[0.08] focus:outline-none focus:ring-0 transition-all duration-200"
                placeholder="name@company.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-white/40">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-[14px] text-white placeholder:text-white/25 focus:border-white/20 focus:bg-white/[0.08] focus:outline-none focus:ring-0 transition-all duration-200"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {loginMutation.isError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-300">
                  {loginMutation.error instanceof Error
                    ? loginMutation.error.message
                    : t('login.invalidCredentials')}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-accent-400 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-brand-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-brand-500/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  ...
                </span>
              ) : (
                t('login.signIn')
              )}
            </button>
          </form>
        </div>

        {/* Language switcher - clean, below the card */}
        <div className="mt-8 flex items-center justify-center gap-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                currentLang === lang.code
                  ? 'bg-white/15 text-white'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-white/20">
          {t('login.footerNote')}
        </p>
      </div>

      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
