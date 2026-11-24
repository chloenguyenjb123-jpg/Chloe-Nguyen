import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { CheckCircle2, Globe, Loader2, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { useI18n } from '../i18n/LanguageContext';

export function LoginScreen() {
  const { lang, setLang, t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed-by-user')) {
        setError(
          lang === 'en'
            ? 'You closed the Google sign-in window. Please try again.'
            : 'Bạn đã đóng cửa sổ đăng nhập Google. Vui lòng thử lại.'
        );
      } else {
        setError(
          lang === 'en'
            ? 'Unable to sign in with Google right now. Please try again.'
            : 'Không thể đăng nhập bằng Google lúc này. Vui lòng thử lại.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0] flex flex-col justify-center items-center p-4 sm:p-8 relative">
      <div className="absolute top-5 right-5 flex items-center gap-1 bg-white border border-[#E8DFD6] rounded-xl p-1 shadow-xs">
        <Globe className="w-3.5 h-3.5 text-[#A77C78] ml-2" />
        <button
          type="button"
          onClick={() => setLang('vi')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
            lang === 'vi' ? 'bg-[#55443F] text-[#F8F5F0]' : 'text-[#7F6D67] hover:text-[#55443F]'
          }`}
        >
          VI
        </button>
        <button
          type="button"
          onClick={() => setLang('en')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
            lang === 'en' ? 'bg-[#55443F] text-[#F8F5F0]' : 'text-[#7F6D67] hover:text-[#55443F]'
          }`}
        >
          EN
        </button>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white border border-[#E8DFD6] rounded-3xl shadow-sm overflow-hidden">
        <div className="lg:col-span-7 p-8 sm:p-10 bg-gradient-to-br from-[#F7ECEC] via-[#F8F5F0] to-[#EFE5DC] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#E8DFD6]">
          <div>
            <div className="inline-flex items-center gap-2.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#55443F] text-[#F8F5F0] flex items-center justify-center font-display font-semibold text-base shadow-xs">
                DH
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-[#55443F] leading-none">
                  {t.login.title}
                </p>
                <p className="text-xs text-[#A77C78] mt-1">{t.brandTagline}</p>
              </div>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#55443F] leading-snug mb-3">
              {t.login.subtitle}
            </h1>
          </div>

          <div className="space-y-4 mt-8">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EBCFD0]/60 text-[#55443F] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#55443F]">{t.login.feature1Title}</p>
                <p className="text-xs text-[#7F6D67] mt-0.5 leading-relaxed">{t.login.feature1Desc}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#A8B5A0]/35 text-[#55443F] flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#55443F]">{t.login.feature2Title}</p>
                <p className="text-xs text-[#7F6D67] mt-0.5 leading-relaxed">{t.login.feature2Desc}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#D8C3B5]/50 text-[#55443F] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#55443F]">{t.login.feature3Title}</p>
                <p className="text-xs text-[#7F6D67] mt-0.5 leading-relaxed">{t.login.feature3Desc}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-center bg-white">
          <div className="mb-7">
            <h2 className="font-display text-2xl font-semibold text-[#55443F] mb-2">
              {lang === 'en' ? 'Welcome back' : 'Chào mừng trở lại'}
            </h2>
            <p className="text-sm text-[#7F6D67] leading-relaxed">
              {lang === 'en'
                ? 'Sign in with your Google account to sync tasks, finances, habits, and notes.'
                : 'Đăng nhập bằng tài khoản Google để đồng bộ công việc, tài chính, thói quen và ghi chú.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#F7ECEC] border border-[#EBCFD0] text-xs text-[#55443F]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#55443F] text-[#F8F5F0] text-sm font-semibold hover:bg-[#433531] disabled:opacity-60 transition-colors shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.login.signingIn}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.92h5.27c-.23 1.48-1.69 4.35-5.27 4.35-3.18 0-5.77-2.63-5.77-5.87s2.59-5.87 5.77-5.87c1.81 0 3.02.77 3.71 1.44l2.53-2.44C16.8 4.1 14.7 3.2 12.18 3.2 7.03 3.2 2.86 7.37 2.86 12.5s4.17 9.3 9.32 9.3c5.38 0 8.95-3.78 8.95-9.1 0-.61-.07-1.08-.18-1.6z"
                  />
                </svg>
                <span>{t.login.googleButton}</span>
              </>
            )}
          </button>

          <div className="mt-6 pt-5 border-t border-[#E8DFD6] flex items-start gap-2.5 text-xs text-[#7F6D67]">
            <ShieldCheck className="w-4 h-4 text-[#5B6B52] shrink-0 mt-0.5" />
            <span>{t.login.securityNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
