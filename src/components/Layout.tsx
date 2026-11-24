import { useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeftRight,
  Bot,
  CheckSquare,
  FileBarChart2,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  StickyNote,
  Target,
  Wallet,
  X,
} from 'lucide-react';
import type { NavSection } from '../types';
import { useI18n } from '../i18n/LanguageContext';

interface LayoutProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  user: User;
  displayName?: string;
  onSignOut: () => void;
  onChangeLanguage: (next: 'vi' | 'en') => void;
  onOpenQuickAdd: (mode: 'task' | 'transaction' | 'note') => void;
  children: ReactNode;
}

export function Layout({
  activeSection,
  onSelectSection,
  user,
  displayName,
  onSignOut,
  onChangeLanguage,
  onOpenQuickAdd,
  children,
}: LayoutProps) {
  const { lang, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: NavSection; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'tasks', label: t.nav.tasks, icon: CheckSquare },
    { id: 'expenses', label: t.nav.expenses, icon: Wallet },
    { id: 'notes', label: t.nav.notes, icon: StickyNote },
    { id: 'goals-habits', label: t.nav.goalsHabits, icon: Target },
    { id: 'exchange-rates', label: t.nav.exchangeRates, icon: ArrowLeftRight },
    { id: 'ai-assistant', label: t.nav.aiAssistant, icon: Bot },
    { id: 'reports', label: t.nav.reports, icon: FileBarChart2 },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  const activeLabel = navItems.find((n) => n.id === activeSection)?.label || t.nav.dashboard;
  const shownName = displayName || user.displayName || user.email?.split('@')[0] || 'Daily Hub';

  const handleNavClick = (section: NavSection) => {
    onSelectSection(section);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[var(--dh-bg)] text-[#55443F]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-[#E8DFD6]">
        <div className="px-5 py-5 border-b border-[#E8DFD6] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#55443F] text-[#F8F5F0] flex items-center justify-center font-display font-semibold text-sm shadow-xs">
            DH
          </div>
          <div>
            <p className="font-display text-base font-semibold text-[#55443F] leading-none">Daily Hub</p>
            <p className="text-[11px] text-[#A77C78] mt-1">{t.common.timezoneNote}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#F7ECEC] text-[#55443F] border border-[#EBCFD0] shadow-xs'
                    : 'text-[#7F6D67] hover:bg-[#F8F5F0] hover:text-[#55443F] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#A77C78]' : 'text-[#9A8983]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E8DFD6] bg-[#FCF9F6]">
          <div className="flex items-center gap-2.5 mb-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={shownName}
                className="w-8 h-8 rounded-full object-cover border border-[#D8C3B5]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#EBCFD0] text-[#55443F] flex items-center justify-center text-xs font-semibold">
                {shownName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#55443F] truncate">{shownName}</p>
              <p className="text-[11px] text-[#7F6D67] truncate">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-[#7F6D67] bg-white border border-[#E8DFD6] rounded-xl hover:bg-[#F7ECEC] hover:text-[#55443F] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.common.signOut}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#55443F]/30 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-xl border-r border-[#E8DFD6]">
            <div className="px-4 py-4 border-b border-[#E8DFD6] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#55443F] text-[#F8F5F0] flex items-center justify-center font-display font-semibold text-xs">
                  DH
                </div>
                <span className="font-display text-sm font-semibold text-[#55443F]">Daily Hub</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#7F6D67] hover:text-[#55443F] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                      active
                        ? 'bg-[#F7ECEC] text-[#55443F] border border-[#EBCFD0]'
                        : 'text-[#7F6D67] hover:bg-[#F8F5F0]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[#E8DFD6]">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#55443F] bg-[#F8F5F0] border border-[#E8DFD6] rounded-xl"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.common.signOut}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-[#FCF9F6]/90 backdrop-blur-md border-b border-[#E8DFD6] px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[#7F6D67] hover:text-[#55443F] rounded-xl"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg sm:text-xl font-semibold text-[#55443F] truncate">
              {activeLabel}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Language Switcher */}
            <div className="flex items-center gap-0.5 bg-white border border-[#E8DFD6] rounded-xl p-0.5">
              <Globe className="w-3.5 h-3.5 text-[#A77C78] mx-1.5 hidden sm:block" />
              <button
                type="button"
                onClick={() => onChangeLanguage('vi')}
                className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  lang === 'vi' ? 'bg-[#55443F] text-[#F8F5F0]' : 'text-[#7F6D67] hover:text-[#55443F]'
                }`}
              >
                VI
              </button>
              <button
                type="button"
                onClick={() => onChangeLanguage('en')}
                className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  lang === 'en' ? 'bg-[#55443F] text-[#F8F5F0]' : 'text-[#7F6D67] hover:text-[#55443F]'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenQuickAdd('task')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#F8F5F0] bg-[#55443F] rounded-xl hover:bg-[#433531] transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.common.quickAddTask}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenQuickAdd('transaction')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#55443F] bg-[#EBCFD0]/60 border border-[#EBCFD0] rounded-xl hover:bg-[#EBCFD0] transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.common.quickAddExpense}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenQuickAdd('note')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#55443F] bg-white border border-[#E8DFD6] rounded-xl hover:bg-[#F8F5F0] transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.common.quickAddNote}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
