import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <AlertTriangle className="w-12 h-12 text-stone-300 mb-4" />
          <h2 className="text-lg font-bold text-knot-dark mb-2">页面出错了</h2>
          <p className="text-sm text-knot-muted text-center mb-6">
            {this.state.error?.message || "发生了未知错误"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 transition-colors"
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
