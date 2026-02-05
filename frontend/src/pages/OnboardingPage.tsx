import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { createSession } from '../lib/userSession';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartTrial = async () => {
    setIsLoading(true);
    
    // Create a new session for this user
    createSession();
    
    // Simulate workspace setup with a brief delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Navigate to dashboard
    navigate('/dashboard');
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col items-center justify-center">
        {/* Animated background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]"></div>
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-8 animate-pulse">
            <Zap className="w-8 h-8 text-white" />
          </div>
          
          {/* Spinner */}
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-6" />
          
          {/* Text */}
          <h2 className="text-2xl font-bold mb-2">Setting up your workspace...</h2>
          <p className="text-slate-400">This will only take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden flex flex-col">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]"></div>
      
      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">LeadsPilot</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 rounded-full border border-amber-500/30">
            ✨ Beta
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-16 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Choose How to Get Started
        </h1>
        <p className="text-slate-400 text-center mb-12 max-w-lg">
          Connect your own email infrastructure or try the platform instantly with our test domain.
        </p>

        {/* CTA Cards */}
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Option 1: Own Domain (Disabled) */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl blur-xl opacity-50"></div>
            <div className="relative bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 cursor-not-allowed opacity-60">
              {/* Coming Soon Badge */}
              <div className="absolute -top-3 -right-3 px-3 py-1 text-xs font-semibold bg-slate-700 text-slate-400 rounded-full border border-slate-600">
                Coming Soon
              </div>

              <div className="flex items-center justify-center w-14 h-14 mb-6 bg-slate-700/50 rounded-xl">
                <Lock className="w-7 h-7 text-slate-500" />
              </div>

              <h3 className="text-xl font-semibold mb-2 text-slate-400">Use Your Own Domain</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Connect your email server and send from your own professional domain.
              </p>

              <ul className="space-y-2 mb-6 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span>
                  Custom SMTP/API integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span>
                  Full brand control
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span>
                  Unlimited sending
                </li>
              </ul>

              <button
                disabled
                className="w-full py-3 px-6 bg-slate-700/50 text-slate-500 rounded-xl font-medium cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Not Available Yet
              </button>
            </div>
          </div>

          {/* Option 2: Test Domain (Enabled) */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-blue-500/30 p-8 hover:border-blue-400/50 transition-all cursor-pointer"
                 onClick={handleStartTrial}>
              {/* Active Badge */}
              <div className="absolute -top-3 -right-3 px-3 py-1 text-xs font-semibold bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-full shadow-lg shadow-blue-500/25">
                ✓ Available
              </div>

              <div className="flex items-center justify-center w-14 h-14 mb-6 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-xl border border-blue-500/30">
                <Mail className="w-7 h-7 text-blue-400" />
              </div>

              <h3 className="text-xl font-semibold mb-2 text-white">Try with Test Domain</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Get started instantly using our test domain. Perfect for exploring the platform.
              </p>

              <ul className="space-y-2 mb-6 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  Send from test@leadspilot.app
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  Full AI features unlocked
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  No setup required
                </li>
              </ul>

              <button className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]">
                Start Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-slate-600 text-sm">
        <p>© 2026 LeadsPilot. Built with ❤️ for sales teams.</p>
      </footer>
    </div>
  );
}
