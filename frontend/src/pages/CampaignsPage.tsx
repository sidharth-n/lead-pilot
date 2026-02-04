import { useEffect, useState } from 'react';
import { Plus, ChevronRight, ChevronLeft, Check, Sparkles, Mail, Clock, User, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button, Card, StatusBadge } from '../components/ui';
import { campaignsApi } from '../api';

// Available template variables
const VARIABLES = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'company', label: 'Company' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'headline', label: 'Headline' },
  { key: 'email', label: 'Email' },
];

const STEPS = [
  { id: 1, name: 'Basics', icon: User },
  { id: 2, name: 'Email', icon: Mail },
  { id: 3, name: 'AI', icon: Sparkles },
  { id: 4, name: 'Follow-up', icon: Clock },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    from_name: '',
    from_email: '',
    subject_template: '',
    body_template: '',
    ai_prompt: '',
    follow_up_delay_minutes: 2,
    follow_up_subject: '',
    follow_up_body: '',
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await campaignsApi.list();
      setCampaigns(data.campaigns);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const { campaign } = await campaignsApi.create(formData) as { campaign: any };
      navigate(`/campaigns/${campaign.id}`);
    } catch (err: any) {
      alert('Failed to create campaign: ' + err.message);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.name && formData.from_name && formData.from_email;
      case 2: return formData.subject_template && formData.body_template;
      case 3: return formData.ai_prompt;
      case 4: return true;
      default: return false;
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      from_name: '',
      from_email: '',
      subject_template: '',
      body_template: '',
      ai_prompt: '',
      follow_up_delay_minutes: 2,
      follow_up_subject: '',
      follow_up_body: '',
    });
    setCurrentStep(1);
    setShowCreate(false);
  };

  // Insert variable at end of field
  const insertVariable = (field: keyof typeof formData, varKey: string) => {
    const variable = `{{${varKey}}}`;
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string) + variable
    }));
  };

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 mt-1">Manage email sequences</p>
        </div>
        {!showCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Campaign
          </Button>
        )}
      </div>

      {/* Multi-Step Wizard */}
      {showCreate && (
        <div className="mb-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {STEPS.map((step, idx) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        currentStep > step.id 
                          ? 'bg-green-500 text-white' 
                          : currentStep === step.id 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`mt-2 text-sm font-medium ${
                      currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-20 h-1 mx-4 rounded transition-colors duration-300 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <Card className="max-w-2xl mx-auto overflow-hidden">
            <div className="p-8">
              {/* Step 1: Basics */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Let's get started</h2>
                    <p className="text-gray-500 mt-2">Basic campaign information</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                    <input
                      className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 border text-lg"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Q1 SaaS Outreach"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                      <input
                        className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 border"
                        value={formData.from_name}
                        onChange={e => setFormData({ ...formData, from_name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Email</label>
                      <input
                        type="email"
                        className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 border"
                        value={formData.from_email}
                        onChange={e => setFormData({ ...formData, from_email: e.target.value })}
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Email Template */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Compose your email</h2>
                    <p className="text-gray-500 mt-2">This is the base template for your outreach</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
                    <input
                      className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 border"
                      value={formData.subject_template}
                      onChange={e => setFormData({ ...formData, subject_template: e.target.value })}
                      placeholder="Quick question, {{first_name}}"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
                    <textarea
                      rows={8}
                      className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 border font-mono text-sm"
                      value={formData.body_template}
                      onChange={e => setFormData({ ...formData, body_template: e.target.value })}
                      placeholder={`Hi {{first_name}},

I noticed you're at {{company}} and thought you might be interested in what we're building.

Would love to chat for 15 minutes if you have time this week.

Best,
${formData.from_name || '[Your Name]'}`}
                    />
                  </div>

                  {/* Variable Chips */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-gray-500">Insert:</span>
                    {VARIABLES.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable('body_template', v.key)}
                        className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors font-medium"
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: AI Personalization */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">AI Personalization</h2>
                    <p className="text-gray-500 mt-2">Tell the AI how to make each email unique</p>
                  </div>

                  {/* Info Box */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-5">
                    <div className="flex gap-3">
                      <Info className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-gray-700 mb-2">
                          <strong>How it works:</strong> Instead of just replacing {"{{first_name}}"} with "John", 
                          the AI rewrites your entire email based on these instructions + any research gathered.
                        </p>
                        <p className="text-gray-600">
                          After adding leads, you can click <strong>"Research"</strong> to gather company intel, 
                          then <strong>"Generate AI"</strong> to create personalized versions.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">AI Instructions</label>
                    <textarea
                      rows={6}
                      className="w-full rounded-xl border-purple-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 px-4 py-3 border"
                      value={formData.ai_prompt}
                      onChange={e => setFormData({ ...formData, ai_prompt: e.target.value })}
                      placeholder={`Write a personalized cold email for a SaaS product.
- Keep it friendly and conversational
- Under 100 words
- Mention something specific about their company
- End with a soft call-to-action`}
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Be specific about tone, length, and what you're offering.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 4: Follow-up */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Follow-up Settings</h2>
                    <p className="text-gray-500 mt-2">Automatic follow-up if no reply</p>
                  </div>

                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Wait before sending follow-up</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        className="w-24 rounded-xl border-gray-200 shadow-sm focus:border-orange-500 focus:ring-orange-500 px-4 py-3 border text-center text-lg font-semibold"
                        value={formData.follow_up_delay_minutes}
                        onChange={e => setFormData({ ...formData, follow_up_delay_minutes: parseInt(e.target.value) || 1 })}
                      />
                      <span className="text-gray-600">minutes</span>
                      <span className="text-sm text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                        💡 Use 1-2 min for testing
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Subject</label>
                    <input
                      className="w-full rounded-xl border-gray-200 shadow-sm focus:border-orange-500 focus:ring-orange-500 px-4 py-3 border"
                      value={formData.follow_up_subject}
                      onChange={e => setFormData({ ...formData, follow_up_subject: e.target.value })}
                      placeholder="Re: Quick question, {{first_name}}"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Message</label>
                    <textarea
                      rows={5}
                      className="w-full rounded-xl border-gray-200 shadow-sm focus:border-orange-500 focus:ring-orange-500 px-4 py-3 border font-mono text-sm"
                      value={formData.follow_up_body}
                      onChange={e => setFormData({ ...formData, follow_up_body: e.target.value })}
                      placeholder={`Hi {{first_name}},

Just wanted to follow up on my previous email. Would love to chat if you have time!

Best,
${formData.from_name || '[Your Name]'}`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-between">
              <div>
                {currentStep > 1 ? (
                  <Button variant="ghost" onClick={prevStep}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
              <div>
                {currentStep < 4 ? (
                  <Button onClick={nextStep} disabled={!canProceed()}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                    <Check className="w-4 h-4 mr-2" /> Create Campaign
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Campaign List - Only show when NOT creating */}
      {!showCreate && (
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-500 mb-6">Create your first campaign to start outreach</p>
              <Button onClick={() => setShowCreate(true)} size="lg">
                <Plus className="w-5 h-5 mr-2" /> Create Campaign
              </Button>
            </div>
          ) : (
            campaigns.map(campaign => (
              <Link key={campaign.id} to={`/campaigns/${campaign.id}`}>
                <Card className="hover:border-blue-400 hover:shadow-lg transition-all duration-200 p-6 group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {campaign.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                        <span>{campaign.from_email}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span>Follow-up: {campaign.follow_up_delay_minutes} mins</span>
                        {campaign.ai_prompt && (
                          <>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span className="text-purple-600 flex items-center gap-1 font-medium">
                              <Sparkles className="w-3 h-3" /> AI Enabled
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={campaign.status} />
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </Layout>
  );
}
