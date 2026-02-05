// frontend/src/components/LeadDetailModal.tsx

import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Save, Sparkles, AlertCircle, Mail, Building, Briefcase, Linkedin, ExternalLink, Copy, Check } from 'lucide-react';
import { Button, Card } from './ui';
import { generationApi } from '../api';

interface LeadDetailModalProps {
  campaignId: string;
  leadId: string;
  lead: any; // Lead data from parent (has contact info)
  campaign: any; // Campaign data for template
  onClose: () => void;
  onSave: () => void;
}

export function LeadDetailModal({ leadId, lead, campaign, onClose, onSave }: LeadDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [editedBody, setEditedBody] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedFollowUpBody, setEditedFollowUpBody] = useState('');
  const [editedFollowUpSubject, setEditedFollowUpSubject] = useState('');
  const [activeTab, setActiveTab] = useState<'default' | 'ai'>('default');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showFullResearch, setShowFullResearch] = useState(false);
  
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    return () => stopPolling();
  }, [leadId]);

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  // Substitute template variables with lead data
  const substituteVariables = (template: string) => {
    if (!template) return '';
    return template
      .replace(/\{\{first_name\}\}/gi, lead?.first_name || '')
      .replace(/\{\{last_name\}\}/gi, lead?.last_name || '')
      .replace(/\{\{company\}\}/gi, lead?.company || '')
      .replace(/\{\{job_title\}\}/gi, lead?.job_title || '')
      .replace(/\{\{email\}\}/gi, lead?.email || '');
  };

  // Get template email (campaign template with variables substituted)
  const getTemplateSubject = () => substituteVariables(campaign?.subject_template || '');
  const getTemplateBody = () => substituteVariables(campaign?.body_template || '');
  const getTemplateFollowUpSubject = () => substituteVariables(campaign?.follow_up_subject || '');
  const getTemplateFollowUpBody = () => substituteVariables(campaign?.follow_up_body || '');

  const loadData = async () => {
    try {
      const json = await generationApi.getLead(leadId);
      
      if (json.lead) {
        setData(json.lead);
        
        // If AI content exists, use it
        if (json.lead.generation_status === 'ready') {
          setEditedSubject(json.lead.generated_subject || '');
          setEditedBody(json.lead.generated_body || '');
          setEditedFollowUpSubject(json.lead.generated_follow_up_subject || '');
          setEditedFollowUpBody(json.lead.generated_follow_up_body || '');
          setActiveTab('ai');
        } else {
          // Use template
          setActiveTab('default');
        }
        
        if (regenerating && json.lead.generation_status === 'ready') {
          setRegenerating(false);
          stopPolling();
          setEditedSubject(json.lead.generated_subject || '');
          setEditedBody(json.lead.generated_body || '');
          setEditedFollowUpSubject(json.lead.generated_follow_up_subject || '');
          setEditedFollowUpBody(json.lead.generated_follow_up_body || '');
          setActiveTab('ai');
        }
        
        if (json.lead.generation_status === 'failed') {
          setRegenerating(false);
          stopPolling();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!regenerating) setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // If on AI tab, save the AI content
      // If on default tab, save the template as the "generated" content
      const contentToSave = activeTab === 'ai' ? {
        generated_subject: editedSubject,
        generated_body: editedBody,
        generated_follow_up_subject: editedFollowUpSubject,
        generated_follow_up_body: editedFollowUpBody,
      } : {
        generated_subject: getTemplateSubject(),
        generated_body: getTemplateBody(),
        generated_follow_up_subject: getTemplateFollowUpSubject(),
        generated_follow_up_body: getTemplateFollowUpBody(),
      };
      
      await generationApi.update(leadId, contentToSave);
      onSave();
      onClose();
    } catch (err) {
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('This will generate new AI-personalized content. Continue?')) return;
    
    setRegenerating(true);
    try {
      await generationApi.regenerate(leadId);
      pollInterval.current = setInterval(loadData, 2000);
    } catch (err) {
      alert('Failed to queue regeneration');
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Parse research data
  const researchData = lead?.research_data ? JSON.parse(lead.research_data) : null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-lg bg-white p-12 text-center text-gray-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          Loading lead details...
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-5xl bg-white p-0 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {lead?.first_name} {lead?.last_name || ''}
            </h2>
            <div className="text-sm text-gray-500">{lead?.company || 'No company'}</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Contact Info & Research */}
          <div className="w-80 bg-gray-50 border-r overflow-y-auto">
            {/* Contact Info */}
            <div className="p-4 border-b">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact Info</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 truncate">{lead?.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{lead?.company || 'No company'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{lead?.job_title || 'No title'}</span>
                </div>
                {lead?.linkedin_url && (
                  <a 
                    href={lead.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span>LinkedIn</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Research Data */}
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Research Data</h3>
              
              {lead?.research_status === 'complete' && researchData ? (
                <div className="space-y-3">
                  {/* Summary */}
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">Summary</div>
                    <div 
                      className={`text-sm text-gray-700 bg-white p-2 rounded border ${showFullResearch ? '' : 'line-clamp-3'}`}
                    >
                      {researchData.summary || 'No summary available'}
                    </div>
                    {researchData.summary?.length > 150 && (
                      <button 
                        onClick={() => setShowFullResearch(!showFullResearch)}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                      >
                        {showFullResearch ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>

                  {/* Icebreaker */}
                  {researchData.icebreaker_suggestions?.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">Icebreaker</div>
                      <div className="text-sm text-gray-700 bg-white p-2 rounded border">
                        "{researchData.icebreaker_suggestions[0]}"
                      </div>
                      <button
                        onClick={() => copyToClipboard(researchData.icebreaker_suggestions[0], 'icebreaker')}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-1"
                      >
                        {copiedField === 'icebreaker' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'icebreaker' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}

                  {/* Pain Points */}
                  {researchData.pain_points?.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">Pain Points</div>
                      <ul className="text-sm text-gray-700 bg-white p-2 rounded border space-y-1">
                        {researchData.pain_points.slice(0, 3).map((point: string, i: number) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-gray-400">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : lead?.research_status === 'researching' ? (
                <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Researching...
                </div>
              ) : lead?.research_status === 'failed' ? (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  Research failed
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-100 p-3 rounded">
                  No research data. Select this lead and click "Research" to gather intel.
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Email Editor */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Tabs: Default / AI */}
            <div className="flex border-b px-6 pt-4">
              <button 
                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors mr-2 ${activeTab === 'default' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('default')}
              >
                Default Template
              </button>
              <button 
                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ai' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('ai')}
                disabled={!data?.generation_status || data?.generation_status === 'pending'}
              >
                <Sparkles className="w-4 h-4" />
                AI Generated
                {data?.generation_status === 'ready' && (
                  <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Ready</span>
                )}
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {regenerating ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Sparkles className="w-12 h-12 mb-4 text-purple-300 animate-pulse" />
                  <p>AI is writing a personalized email...</p>
                </div>
              ) : activeTab === 'default' ? (
                // Default Template Tab
                <div className="space-y-4 max-w-2xl">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mb-4">
                    This is the campaign template with your contact's details filled in. Generate AI content for personalized messaging.
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Subject</label>
                    <div className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                      {getTemplateSubject() || <span className="text-gray-400">No subject template</span>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Body</label>
                    <div className="w-full p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 min-h-[200px] whitespace-pre-wrap">
                      {getTemplateBody() || <span className="text-gray-400">No body template</span>}
                    </div>
                  </div>
                  
                  {/* Generate Button */}
                  <Button 
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="mt-4"
                  >
                    <Sparkles className={`w-4 h-4 mr-2 ${regenerating ? 'animate-pulse' : ''}`} />
                    {regenerating ? 'Generating...' : 'Generate AI Content'}
                  </Button>
                </div>
              ) : (
                // AI Tab
                <div className="space-y-4 max-w-2xl">
                  {data?.generation_status !== 'ready' ? (
                    <div className="text-center py-12">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 mb-4">No AI-generated content yet</p>
                      <Button onClick={handleRegenerate} disabled={regenerating}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate AI Content
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Subject</label>
                        <input
                          type="text"
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium text-gray-900"
                          value={editedSubject}
                          onChange={e => setEditedSubject(e.target.value)}
                          placeholder="Email Subject"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Body</label>
                        <textarea
                          className="w-full p-4 border border-gray-300 rounded-lg h-64 font-sans text-base leading-relaxed text-gray-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none"
                          value={editedBody}
                          onChange={e => setEditedBody(e.target.value)}
                          placeholder="Email body..."
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleRegenerate}
                          disabled={regenerating}
                        >
                          <RefreshCw className={`w-4 h-4 mr-1 ${regenerating ? 'animate-spin' : ''}`} />
                          Regenerate
                        </Button>
                        {data?.last_error && (
                          <div className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {data.last_error}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || regenerating}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save & Approve'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
