import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Zap, Target, Brain, Mail, BarChart3, Clock, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-x-hidden">
      {/* Animated background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,black,transparent)]"></div>
      
      {/* Glowing orbs */}
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">LeadsPilot</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex px-3 py-1 text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 rounded-full border border-amber-500/30">
            ✨ Beta
          </span>
          <button 
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-lg font-medium text-sm transition-all border border-white/10"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 md:px-12 pt-20 pb-32 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-medium bg-white/5 rounded-full border border-white/10 backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-slate-300">AI-Powered Cold Email Campaigns</span>
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
          <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
            10x Your Replies,
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
            Automated and Easy.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Leverage AI to build highly personalized outbound campaigns at scale.
          Research leads, generate unique emails, and send — all in one place.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <button 
            onClick={() => navigate('/login')}
            className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center gap-3 hover:scale-[1.02]"
          >
            Try Beta Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <span className="text-slate-500 text-sm">No credit card required</span>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { icon: Brain, text: 'AI Research' },
            { icon: Target, text: 'Personalized Emails' },
            { icon: Mail, text: 'Automated Sequences' },
          ].map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10"
            >
              <feature.icon className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-300">{feature.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to <span className="text-blue-400">Close More Deals</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              From lead research to personalized outreach, LeadsPilot handles it all.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: 'AI-Powered Research',
                description: 'Automatically research every prospect. Our AI gathers company info, recent news, and personalization hooks.',
                gradient: 'from-blue-500/20 to-cyan-500/20',
                iconColor: 'text-blue-400',
              },
              {
                icon: Mail,
                title: 'Hyper-Personalized Emails',
                description: 'Generate unique, compelling emails for each lead using GPT-4. No more generic templates.',
                gradient: 'from-violet-500/20 to-purple-500/20',
                iconColor: 'text-violet-400',
              },
              {
                icon: BarChart3,
                title: 'Smart Sequences',
                description: 'Set up multi-step follow-up sequences that stop automatically when leads reply.',
                gradient: 'from-emerald-500/20 to-green-500/20',
                iconColor: 'text-emerald-400',
              },
            ].map((feature, i) => (
              <div key={i} className="group relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity`}></div>
                <div className="relative bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 h-full hover:border-slate-600/50 transition-all">
                  <div className={`w-12 h-12 mb-6 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center`}>
                    <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-24 px-6 md:px-12 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Get started in minutes, not hours.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Import Leads', desc: 'Upload your CSV or add contacts manually' },
              { step: '2', title: 'AI Research', desc: 'We research each company automatically' },
              { step: '3', title: 'Generate Emails', desc: 'AI writes personalized emails' },
              { step: '4', title: 'Send & Track', desc: 'Launch campaign and monitor replies' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Sales Teams Choose <span className="text-blue-400">LeadsPilot</span>
              </h2>
              <div className="space-y-6">
                {[
                  { icon: Clock, text: 'Save 10+ hours per week on prospecting' },
                  { icon: Target, text: '3x higher response rates with personalization' },
                  { icon: CheckCircle2, text: 'Never send a generic email again' },
                  { icon: BarChart3, text: 'Track every open, click, and reply' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-lg text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-2xl blur-2xl"></div>
              <div className="relative bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Powered by AI</p>
                    <p className="text-sm text-slate-400">GPT-4 & Perplexity</p>
                  </div>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Emails Generated</span>
                    <span className="font-semibold text-blue-400">10,000+</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Avg. Reply Rate</span>
                    <span className="font-semibold text-emerald-400">12.4%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Time Saved</span>
                    <span className="font-semibold text-violet-400">85%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-violet-500/30 rounded-3xl blur-3xl"></div>
            <div className="relative bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-12 md:p-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to 10x Your Outreach?
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                Join the beta and start sending personalized emails today. No credit card required.
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center gap-3 mx-auto hover:scale-[1.02]"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="relative z-10 py-12 px-6 md:px-12 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-slate-500 mb-6">Powered by</p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-green-400">AI</span>
              </div>
              <span className="text-sm text-slate-500">OpenAI GPT-4</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-blue-400">P</span>
              </div>
              <span className="text-sm text-slate-500">Perplexity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-violet-400">R</span>
              </div>
              <span className="text-sm text-slate-500">Resend</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-slate-600 text-sm border-t border-slate-800">
        <p>© 2026 LeadsPilot. Built with ❤️ for sales teams.</p>
      </footer>
    </div>
  );
}
