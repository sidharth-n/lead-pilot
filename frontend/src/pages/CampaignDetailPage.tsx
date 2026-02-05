import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, UserPlus, Reply, RefreshCw, Eye, Search, Sparkles, Settings, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button, Card, StatusBadge } from '../components/ui';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { AddLeadsModal } from '../components/AddLeadsModal';
import { campaignsApi, contactsApi, researchApi, generationApi } from '../api';
import { format } from 'date-fns';

// Available template variables
const VARIABLES = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'company', label: 'Company' },
  { key: 'job_title', label: 'Job Title' },
];

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLeads, setShowAddLeads] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);
  
  // Lead Selection State (for research/generate actions)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Preview Modal State
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(null);
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState('email'); // 'email' | 'ai' | 'followup'
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Poll for updates every 2s
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [id]);

  // Load available contacts once
  useEffect(() => {
    contactsApi.list().then(data => setContacts(data.contacts));
  }, []);

  const loadData = async () => {
    if (!id) return;
    try {
      const [campaignData, leadsData] = await Promise.all([
        campaignsApi.get(id),
        campaignsApi.getLeads(id)
      ]);
      setCampaign(campaignData.campaign);
      setStats(campaignData.stats);
      setLeads(leadsData.leads);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!campaign || !id) return;
    try {
      if (campaign.status === 'active') {
        await campaignsApi.pause(id);
      } else {
        await campaignsApi.start(id);
      }
      loadData();
    } catch (err: any) {
      alert('Action failed: ' + err.message);
    }
  };

  const handleSimulateReply = async (leadId: string) => {
    if (!confirm('Simulate a reply from this lead? This will stop follow-ups.')) return;
    setSimulating(leadId);
    try {
      await campaignsApi.simulateReply(leadId);
      setTimeout(loadData, 500);
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setSimulating(null);
    }
  };

  // Open Settings Modal
  const openSettings = () => {
    setEditData({
      name: campaign.name,
      from_name: campaign.from_name,
      from_email: campaign.from_email,
      subject_template: campaign.subject_template,
      body_template: campaign.body_template,
      ai_prompt: campaign.ai_prompt || '',
      follow_up_delay_minutes: campaign.follow_up_delay_minutes,
      follow_up_subject: campaign.follow_up_subject || '',
      follow_up_body: campaign.follow_up_body || '',
    });
    setShowSettings(true);
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await campaignsApi.update(id, editData);
      setShowSettings(false);
      loadData();
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete Campaign
  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this campaign? This cannot be undone.')) return;
    try {
      await campaignsApi.delete(id);
      navigate('/campaigns');
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // Handle Research for selected leads
  const handleResearchSelected = async () => {
    if (selectedLeads.length === 0) {
      alert('Please select at least one lead to research.');
      return;
    }
    setIsResearching(true);
    try {
      await researchApi.researchLeads(selectedLeads);
      setSelectedLeads([]);
      loadData();
    } catch (err: any) {
      alert('Research failed: ' + err.message);
    } finally {
      setIsResearching(false);
    }
  };

  // Handle AI Generation for selected leads
  const handleGenerateSelected = async () => {
    if (selectedLeads.length === 0) {
      alert('Please select at least one lead to generate AI emails.');
      return;
    }
    setIsGenerating(true);
    try {
      await generationApi.bulkGenerate(selectedLeads);
      setSelectedLeads([]);
      loadData();
    } catch (err: any) {
      alert('Generation failed: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle lead selection
  const toggleLeadSelection = (leadId: string) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
    }
  };

  // Select/Deselect all leads
  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  // Calculate stats
  const researchStats = {
    researched: leads.filter(l => l.research_status === 'complete').length,
    researching: leads.filter(l => l.research_status === 'researching').length,
  };

  const generationStats = {
    ready: leads.filter(l => l.generation_status === 'ready').length,
    generating: leads.filter(l => l.generation_status === 'generating').length,
    template: leads.filter(l => l.generation_status === 'template').length,
    failed: leads.filter(l => l.generation_status === 'failed').length,
  };

  if (loading || !campaign) {
    return <Layout><div className="text-center py-20">Loading...</div></Layout>;
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <div className="text-gray-500 text-sm">
            Created {format(new Date(campaign.created_at), 'PPP')} • {stats?.total || 0} Leads
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant={campaign.status === 'active' ? 'secondary' : 'primary'}
            onClick={toggleStatus}
            disabled={campaign.status === 'completed'}
          >
            {campaign.status === 'active' ? (
              <><Pause className="w-4 h-4 mr-2" /> Pause</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Start Campaign</>
            )}
          </Button>
          <Button variant="outline" onClick={() => setShowAddLeads(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Add Leads
          </Button>
          <Button variant="outline" onClick={openSettings}>
            <Settings className="w-4 h-4 mr-2" /> Settings
          </Button>
        </div>
      </div>

      {/* Add Leads Modal - Full Page */}
      {showAddLeads && (
        <AddLeadsModal
          contacts={contacts}
          existingLeadIds={leads?.map(l => l.contact_id) || []}
          onClose={() => {
            setShowAddLeads(false);
          }}
          onAdd={async (contactIds) => {
            if (!id) return;
            try {
              await campaignsApi.addLeads(id, contactIds);
              setShowAddLeads(false);
              loadData();
            } catch (err: any) {
              alert('Failed to add leads: ' + err.message);
            }
          }}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="p-4 bg-gray-50 !border-none">
          <div className="text-2xl font-bold text-gray-900">{stats?.pending || 0}</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</div>
        </Card>
        <Card className="p-4 bg-blue-50 !border-none">
          <div className="text-2xl font-bold text-blue-600">{stats?.sent || 0}</div>
          <div className="text-xs font-medium text-blue-500 uppercase tracking-wide">Sent</div>
        </Card>
        <Card className="p-4 bg-purple-50 !border-none">
          <div className="text-2xl font-bold text-purple-600">{stats?.waiting_follow_up || 0}</div>
          <div className="text-xs font-medium text-purple-500 uppercase tracking-wide">Waiting</div>
        </Card>
        <Card className="p-4 bg-green-50 !border-none">
          <div className="text-2xl font-bold text-green-600">{stats?.replied || 0}</div>
          <div className="text-xs font-medium text-green-500 uppercase tracking-wide">Replied</div>
        </Card>
      </div>

      {/* Leads List with Selection */}
      <Card>
        {/* Header with Actions */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-gray-900">Campaign Leads</h3>
              <span className="flex items-center text-xs text-gray-500 gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Live Updating
              </span>
            </div>
            
            {/* Bulk Action Buttons */}
            {leads.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {selectedLeads.length} selected
                </span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleResearchSelected}
                  disabled={selectedLeads.length === 0 || isResearching}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Search className={`w-4 h-4 mr-1 ${isResearching ? 'animate-spin' : ''}`} />
                  {isResearching ? 'Researching...' : 'Research'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleGenerateSelected}
                  disabled={selectedLeads.length === 0 || isGenerating}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  <Sparkles className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-pulse' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            )}
          </div>
          
          {/* Progress indicators */}
          {(researchStats.researching > 0 || generationStats.generating > 0) && (
            <div className="mt-2 text-xs text-gray-600">
              {researchStats.researching > 0 && (
                <span className="mr-4">🔍 Researching: {researchStats.researching}</span>
              )}
              {generationStats.generating > 0 && (
                <span>🤖 Generating: {generationStats.generating}</span>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">
                  <input 
                    type="checkbox" 
                    checked={leads.length > 0 && selectedLeads.length === leads.length}
                    onChange={toggleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 font-medium text-gray-500">Contact</th>
                <th className="px-6 py-3 font-medium text-gray-500">Research</th>
                <th className="px-6 py-3 font-medium text-gray-500">Content</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <UserPlus className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className="text-gray-600 font-medium mb-2">No leads in this campaign</p>
                      <p className="text-gray-400 text-sm mb-4">Add contacts to start your outreach</p>
                      <Button onClick={() => setShowAddLeads(true)}>
                        <UserPlus className="w-4 h-4 mr-2" /> Add Leads to Get Started
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                leads?.map(lead => (
                  <tr 
                    key={lead.id} 
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedLeads.includes(lead.id) ? 'bg-blue-50' : ''}`}
                    onClick={(e) => {
                      // Don't open modal if clicking checkbox
                      if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                      setPreviewLeadId(lead.id);
                    }}
                  >
                    {/* Checkbox */}
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    
                    {/* Contact */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{lead.first_name || 'Unknown'}</div>
                      <div className="text-gray-500 text-xs">{lead.company || lead.email}</div>
                    </td>
                    
                    {/* Intel/Research */}
                    <td className="px-6 py-4">
                      {lead.research_status === 'complete' ? (
                        <div className="max-w-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mb-1">
                            ✓ Researched
                          </span>
                          <div className="text-xs text-gray-600 truncate" title={lead.research_data ? JSON.parse(lead.research_data)?.summary : ''}>
                            {lead.research_data ? JSON.parse(lead.research_data)?.summary?.slice(0, 50) + '...' : ''}
                          </div>
                        </div>
                      ) : lead.research_status === 'researching' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Researching...
                        </span>
                      ) : lead.research_status === 'failed' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          ✗ Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                    
                    {/* Email/Generation Status */}
                    <td className="px-6 py-4">
                      {lead.generation_status === 'ready' ? (
                        <div>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mb-1">
                            AI
                          </span>
                          <div className="text-xs text-gray-600 truncate max-w-xs" title={lead.generated_subject}>
                            {lead.generated_subject?.slice(0, 40)}...
                          </div>
                        </div>
                      ) : lead.generation_status === 'generating' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          <Sparkles className="w-3 h-3 mr-1 animate-pulse" /> Generating...
                        </span>
                      ) : lead.generation_status === 'failed' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          ✗ Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Default
                        </span>
                      )}
                    </td>
                    
                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    
                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setPreviewLeadId(lead.id)}
                        >
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Button>

                        {['sent', 'waiting_follow_up'].includes(lead.status) && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleSimulateReply(lead.id)}
                            disabled={simulating === lead.id}
                          >
                            <Reply className="w-3 h-3 mr-1" />
                            {simulating === lead.id ? '...' : 'Reply'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Lead Detail Modal */}
      {previewLeadId && id && campaign && (
         <LeadDetailModal 
           campaignId={id} 
           leadId={previewLeadId}
           lead={leads.find(l => l.id === previewLeadId)}
           campaign={campaign}
           onClose={() => setPreviewLeadId(null)}
           onSave={loadData}
         />
      )}

      {/* Settings Modal */}
      {showSettings && editData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Campaign Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                  <input
                    className="w-full rounded-lg border-gray-200 px-3 py-2 border focus:border-blue-500 focus:ring-blue-500"
                    value={editData.name}
                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                    <input
                      className="w-full rounded-lg border-gray-200 px-3 py-2 border focus:border-blue-500 focus:ring-blue-500"
                      value={editData.from_name}
                      onChange={e => setEditData({ ...editData, from_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                    <input
                      className="w-full rounded-lg border-gray-200 px-3 py-2 border focus:border-blue-500 focus:ring-blue-500"
                      value={editData.from_email}
                      onChange={e => setEditData({ ...editData, from_email: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              {/* Email Section - Collapsible */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSettingsExpanded(settingsExpanded === 'email' ? '' : 'email')}
                  className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between text-left hover:bg-gray-100"
                >
                  <span className="font-medium text-gray-900">📧 Email Template</span>
                  {settingsExpanded === 'email' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {settingsExpanded === 'email' && (
                  <div className="p-4 space-y-3 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                      <input
                        className="w-full rounded-lg border-gray-200 px-3 py-2 border focus:border-blue-500 focus:ring-blue-500"
                        value={editData.subject_template}
                        onChange={e => setEditData({ ...editData, subject_template: e.target.value })}
                      />
                      <div className="flex gap-1 mt-1">
                        {VARIABLES.map(v => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => setEditData({ ...editData, subject_template: editData.subject_template + `{{${v.key}}}` })}
                            className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                      <textarea
                        rows={5}
                        className="w-full rounded-lg border-gray-200 px-3 py-2 border focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                        value={editData.body_template}
                        onChange={e => setEditData({ ...editData, body_template: e.target.value })}
                      />
                      <div className="flex gap-1 mt-1">
                        {VARIABLES.map(v => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => setEditData({ ...editData, body_template: editData.body_template + `{{${v.key}}}` })}
                            className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* AI Section - Collapsible */}
              <div className="border border-purple-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSettingsExpanded(settingsExpanded === 'ai' ? '' : 'ai')}
                  className="w-full px-4 py-3 bg-purple-50 flex items-center justify-between text-left hover:bg-purple-100"
                >
                  <span className="font-medium text-purple-900">✨ AI Personalization</span>
                  {settingsExpanded === 'ai' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {settingsExpanded === 'ai' && (
                  <div className="p-4 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-1">AI Instructions</label>
                    <textarea
                      rows={4}
                      className="w-full rounded-lg border-purple-200 px-3 py-2 border focus:border-purple-500 focus:ring-purple-500"
                      value={editData.ai_prompt}
                      onChange={e => setEditData({ ...editData, ai_prompt: e.target.value })}
                      placeholder="Tell the AI how to personalize emails..."
                    />
                  </div>
                )}
              </div>
              
              {/* Follow-up Section - Collapsible */}
              <div className="border border-orange-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSettingsExpanded(settingsExpanded === 'followup' ? '' : 'followup')}
                  className="w-full px-4 py-3 bg-orange-50 flex items-center justify-between text-left hover:bg-orange-100"
                >
                  <span className="font-medium text-orange-900">🔄 Follow-up Settings</span>
                  {settingsExpanded === 'followup' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {settingsExpanded === 'followup' && (
                  <div className="p-4 space-y-3 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Subject</label>
                      <input
                        className="w-full rounded-lg border-gray-200 px-3 py-2 border focus:border-orange-500 focus:ring-orange-500"
                        value={editData.follow_up_subject}
                        onChange={e => setEditData({ ...editData, follow_up_subject: e.target.value })}
                      />
                      <div className="flex gap-1 mt-1">
                        {VARIABLES.map(v => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => setEditData({ ...editData, follow_up_subject: editData.follow_up_subject + `{{${v.key}}}` })}
                            className="px-2 py-0.5 text-xs bg-orange-50 text-orange-600 rounded hover:bg-orange-100"
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Body</label>
                      <textarea
                        rows={4}
                        className="w-full rounded-lg border-gray-200 px-3 py-2 border focus:border-orange-500 focus:ring-orange-500 font-mono text-sm"
                        value={editData.follow_up_body}
                        onChange={e => setEditData({ ...editData, follow_up_body: e.target.value })}
                      />
                      <div className="flex gap-1 mt-1">
                        {VARIABLES.map(v => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => setEditData({ ...editData, follow_up_body: editData.follow_up_body + `{{${v.key}}}` })}
                            className="px-2 py-0.5 text-xs bg-orange-50 text-orange-600 rounded hover:bg-orange-100"
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delay (minutes)</label>
                      <input
                        type="number"
                        min="1"
                        className="w-24 rounded-lg border-gray-200 px-3 py-2 border focus:border-orange-500 focus:ring-orange-500"
                        value={editData.follow_up_delay_minutes}
                        onChange={e => setEditData({ ...editData, follow_up_delay_minutes: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                onClick={handleDelete}
                disabled={campaign.status === 'active'}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Campaign
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
