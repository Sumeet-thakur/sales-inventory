import React from 'react';
import NotFound from './pages/NotFound';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // initialize state with the correct type
  state: ErrorBoundaryState = {
    hasError: false,
  };

  // when an error is thrown in a child, flip hasError
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // you could also log to a service here
  }

  render() {
    if (this.state.hasError) {
      // render your fallback
        return (
        <div>
          <h2>Something went wrong.</h2>
          <p>Please contact developer Team and refresh page</p>
          
        </div>
      );
    }

    // otherwise render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
