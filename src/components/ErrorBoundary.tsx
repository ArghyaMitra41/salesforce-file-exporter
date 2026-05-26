import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-start gap-3 text-red-700 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-lg mb-1">Something went wrong</h2>
                <p className="text-sm text-red-600">{this.state.error.message}</p>
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
