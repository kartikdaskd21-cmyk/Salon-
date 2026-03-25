import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleGlobalRejection);
  }

  public componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleGlobalRejection);
  }

  private handleGlobalError = (event: ErrorEvent) => {
    console.error('Global error caught:', event.error);
    this.setState({ hasError: true, error: event.error, errorInfo: null });
  };

  private handleGlobalRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection caught:', event.reason);
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    this.setState({ hasError: true, error, errorInfo: null });
  };

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private parseError(error: Error | null): { message: string, details?: string } {
    if (!error) return { message: 'An unknown error occurred.' };
    
    try {
      // Check if it's our custom Firestore error format
      const parsed = JSON.parse(error.message);
      if (parsed && parsed.error && parsed.operationType) {
        let userMessage = 'A database error occurred.';
        if (parsed.error.includes('Missing or insufficient permissions')) {
          userMessage = 'You do not have permission to perform this action. Please check your account role or sign in again.';
        } else if (parsed.error.includes('offline')) {
          userMessage = 'You appear to be offline. Please check your network connection.';
        } else if (parsed.error.includes('Quota exceeded')) {
          userMessage = 'The application has exceeded its database quota. Please try again later.';
        }
        return { 
          message: userMessage, 
          details: `Operation: ${parsed.operationType} on path: ${parsed.path || 'unknown'}\nError: ${parsed.error}` 
        };
      }
    } catch (e) {
      // Not a JSON error string
    }

    if (error.message.includes('Missing or insufficient permissions')) {
      return { message: 'You do not have permission to access this data.' };
    }
    if (error.message.includes('network') || error.message.includes('offline')) {
      return { message: 'Network error. Please check your internet connection.' };
    }

    return { message: 'Something went wrong.', details: error.message };
  }

  public render() {
    if (this.state.hasError) {
      const { message, details } = this.parseError(this.state.error);

      return (
        <div className="min-h-screen bg-[#f5f2ed] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-black/10 p-8 shadow-2xl text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-serif font-semibold text-[#1a1a1a] mb-2 uppercase tracking-widest">
              Oops! Something went wrong
            </h1>
            <p className="text-[#1a1a1a]/70 font-sans text-sm mb-6 leading-relaxed">
              {message}
            </p>
            
            {details && (
              <div className="w-full bg-black/5 p-4 rounded-sm mb-6 text-left overflow-x-auto">
                <p className="text-xs font-mono text-[#1a1a1a]/60 whitespace-pre-wrap">
                  {details}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] text-white font-sans text-xs font-semibold tracking-[0.2em] uppercase hover:bg-black transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
