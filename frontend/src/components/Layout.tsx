import React, { type ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Send, Zap } from 'lucide-react';
import { processorApi } from '../api';
import { hasSession } from '../lib/userSession';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [running, setRunning] = React.useState(false);

  // Redirect to onboarding if no session exists
  useEffect(() => {
    if (!hasSession()) {
      navigate('/onboarding');
    }
  }, [navigate]);

  const isActive = (path: string) => location.pathname === path;

  const runProcessor = async () => {
    setRunning(true);
    try {
      await processorApi.run();
      // Use a custom event or context in a real app, but this works for demo
      window.dispatchEvent(new Event('processor-run'));
      alert('Processor run triggered!');
    } catch (err: any) {
      alert('Failed to run processor: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-10">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <Send className="w-6 h-6" /> LeadPilot
          </h1>
        </div>
        <nav className="p-4 space-y-1">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              isActive('/dashboard') 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </Link>
          <Link
            to="/campaigns"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              isActive('/campaigns') || location.pathname.startsWith('/campaigns')
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Send className="w-5 h-5" /> Campaigns
          </Link>
          <Link
            to="/contacts"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              isActive('/contacts') 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-5 h-5" /> Contacts
          </Link>
        </nav>
        
        <div className="p-4 mt-auto border-t border-gray-200 absolute bottom-0 w-full">
          <button
            onClick={runProcessor}
            disabled={running}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all ${
              running ? 'bg-orange-400 cursor-wait' : 'bg-orange-500 hover:bg-orange-600 shadow-sm'
            }`}
          >
            <Zap className="w-4 h-4" />
            {running ? 'Running...' : 'Run Processor'}
          </button>
          <p className="text-xs text-center text-gray-500 mt-2">
            Manually trigger email sending
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 ml-64 overflow-y-auto min-h-screen">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
