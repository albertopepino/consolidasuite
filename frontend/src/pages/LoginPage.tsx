import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '@/api/hooks';
import { useAuthStore } from '@/store/authStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/Button';
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
      // Error handled by mutation state
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 25%, #1e40af 50%, #7c3aed 75%, #1e3a5f 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite',
        }}
      />

      {/* Mesh gradient overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.3) 0%, transparent 50%), radial-gradient(ellipse at 40% 80%, rgba(16,185,129,0.2) 0%, transparent 50%)',
        }}
      />

      {/* Floating decorative orbs */}
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 right-1/3 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      {/* Left panel: Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white animate-fade-in">
        <div>
          <img src="/logo.png" alt="ConsolidaSuite" className="h-10 w-auto brightness-0 invert opacity-90" />
        </div>
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            Consolidation<br />Suite
          </h1>
          <p className="text-lg text-white/60 max-w-md leading-relaxed">
            Centralized financial reporting, KPI dashboards, and budget management
            for multi-site organizations across Europe.
          </p>
          <div className="flex gap-8 text-sm text-white/40">
            <div>
              <div className="text-3xl font-bold text-white">50+</div>
              <div className="mt-0.5">KPI Metrics</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">10+</div>
              <div className="mt-0.5">Currencies</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">Real-time</div>
              <div className="mt-0.5">Consolidation</div>
            </div>
          </div>
        </div>
        <div className="text-xs text-white/30">
          Secure. Compliant. GDPR-ready.
        </div>
      </div>

      {/* Right panel: Login form */}
      <div className="flex w-full items-center justify-center px-8 lg:w-1/2">
        <div
          className="w-full max-w-md glass-card p-8 animate-scale-in"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 font-bold text-lg text-white shadow-lg shadow-blue-500/30">
                IF
              </div>
              <span className="text-xl font-semibold text-white">ConsolidaSuite</span>
            </div>
          </div>

          {/* Logo glow for desktop */}
          <div className="hidden lg:block mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 font-bold text-xl text-white shadow-xl shadow-blue-500/30">
              IF
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">
              {t('login.welcome')}
            </h2>
            <p className="mt-2 text-sm text-white/50">
              {t('login.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="block w-full rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-blue-400/50 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200"
                placeholder="name@company.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="block w-full rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-blue-400/50 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200"
                placeholder="Enter your password"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {loginMutation.isError && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3.5">
                <p className="text-sm text-red-300">
                  {loginMutation.error instanceof Error
                    ? loginMutation.error.message
                    : t('login.invalidCredentials')}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full !rounded-xl !py-3 !text-sm !font-semibold shadow-xl shadow-blue-500/25"
              size="lg"
              loading={loginMutation.isPending}
            >
              {t('login.signIn')}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-white/30">
            {t('login.secureNote')}
          </p>

          {/* Language selector */}
          <div className="mt-6 flex justify-center gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  currentLang === lang.code
                    ? 'bg-white/20 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/10'
                }`}
              >
                {lang.flag} {lang.label}
              </button>
            ))}
          </div>
        </div>
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
