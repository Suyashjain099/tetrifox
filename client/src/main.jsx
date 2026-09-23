import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Tetrifox Console Error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] text-slate-900 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-lg font-bold text-slate-900">Session Resync Required</h2>
            <p className="text-xs text-slate-500">
              A cached session mismatch occurred: {this.state.error?.message || 'Unexpected state'}.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
            >
              Reset Session & Reload Console
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
