import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReload = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      let friendlyMsg = this.state.errorMessage;
      const isEn = typeof window !== 'undefined' && localStorage.getItem('dailyhub_lang') === 'en';
      try {
        const parsed = JSON.parse(this.state.errorMessage) as { error?: string; path?: string };
        if (parsed.error) {
          friendlyMsg = isEn
            ? `Data access error (${parsed.path || 'Firestore'}): ${parsed.error}`
            : `Lỗi truy cập dữ liệu (${parsed.path || 'Firestore'}): ${parsed.error}`;
        }
      } catch {
        // Non-JSON error message
      }

      return (
        <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E8DFD6] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-[#A77C78] mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold text-[#55443F]">
                {isEn ? 'Display Error Occurred' : 'Đã xảy ra sự cố hiển thị'}
              </h1>
            </div>
            <p className="text-sm text-[#7F6D67] leading-relaxed mb-5 break-words">{friendlyMsg}</p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#F8F5F0] bg-[#55443F] rounded-xl hover:bg-[#433531] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {isEn ? 'Reload Application' : 'Tải lại ứng dụng'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
