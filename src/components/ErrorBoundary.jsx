import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
                    <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-8 max-w-2xl w-full">
                        <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong.</h1>
                        <div className="bg-black/50 p-4 rounded-lg overflow-auto mb-4 font-mono text-sm text-red-300">
                            {this.state.error && this.state.error.toString()}
                        </div>
                        <details className="text-gray-400 text-sm cursor-pointer">
                            <summary>Stack Trace</summary>
                            <pre className="mt-2 whitespace-pre-wrap">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
