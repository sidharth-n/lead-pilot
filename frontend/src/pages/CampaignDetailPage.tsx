import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, UserPlus, Reply, RefreshCw, Eye } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button, Card, StatusBadge } from '../components/ui';
import { PreviewEmailModal } from '../components/PreviewEmailModal';
import { campaignsApi, contactsApi } from '../api';
import { format } from 'date-fns';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLeads, setShowAddLeads] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [simulating, setSimulating] = useState<string | null>(null);
  
  // Preview Modal State
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(null);

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

  const handleAddLeads = async () => {
    if (!id || selectedContacts.length === 0) return;
    try {
      await campaignsApi.addLeads(id, selectedContacts);
      setShowAddLeads(false);
      setSelectedContacts([]);
      loadData();
    } catch (err: any) {
      alert('Failed to add leads: ' + err.message);
    }
  };

  const handleSimulateReply = async (leadId: string) => {
    if (!confirm('Simulate a reply from this lead? This will stop follow-ups.')) return;
    setSimulating(leadId);
    try {
      await campaignsApi.simulateReply(leadId);
      // Wait a bit to let the user see the change
      setTimeout(loadData, 500);
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setSimulating(null);
    }
  };

  // Calculate Generation Stats
  const generationStats = leads ? {
    total: leads.length,
    ready: leads.filter(l => l.generation_status === 'ready').length,
    pending: leads.filter(l => l.generation_status === 'pending' || l.generation_status === 'generating').length,
    failed: leads.filter(l => l.generation_status === 'failed').length,
  } : { total: 0, ready: 0, pending: 0, failed: 0 };

  const progressPercent = generationStats.total > 0 
    ? Math.round((generationStats.ready / generationStats.total) * 100) 
    : 0;

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
        </div>
      </div>

      {/* AI Generation Progress Bar */}
      {leads.length > 0 && campaign.ai_prompt && (
        <Card className="mb-8 p-4 bg-indigo-50 border-indigo-100">
           <div className="flex justify-between items-center mb-2">
             <div className="flex items-center gap-2">
               <RefreshCw className={`w-4 h-4 text-indigo-600 ${generationStats.pending > 0 ? 'animate-spin' : ''}`} />
               <h3 className="font-semibold text-indigo-900">AI Personalization Progress</h3>
             </div>
             <span className="text-indigo-700 text-sm font-medium">{generationStats.ready} / {generationStats.total} Emails Ready</span>
           </div>
           
           <div className="w-full bg-indigo-200 rounded-full h-2.5">
             <div 
               className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
               style={{ width: `${progressPercent}%` }}
             ></div>
           </div>
           
           {generationStats.failed > 0 && (
             <div className="mt-2 text-xs text-red-600 font-medium">
               ⚠️ {generationStats.failed} generations failed. Check leads below.
             </div>
           )}
        </Card>
      )}

      {/* Add Leads Modal/Panel */}
      {showAddLeads && (
        <Card className="mb-8 p-6 bg-blue-50 border-blue-100">
          <h2 className="text-lg font-semibold mb-4 text-blue-900">Select Contacts to Add</h2>
          <div className="bg-white rounded-lg border border-gray-200 max-h-60 overflow-y-auto mb-4">
            {contacts.map(contact => {
              const isAlreadyAdded = leads?.some(l => l.contact_id === contact.id);
              return (
                <label key={contact.id} className={`flex items-center p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${isAlreadyAdded ? 'opacity-50 bg-gray-50' : ''}`}>
                  <input
                    type="checkbox"
                    className="mr-3 rounded text-blue-600 focus:ring-blue-500"
                    checked={selectedContacts.includes(contact.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedContacts([...selectedContacts, contact.id]);
                      } else {
                        setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                      }
                    }}
                    disabled={isAlreadyAdded}
                  />
                  <div>
                    <div className="font-medium text-gray-900">{contact.first_name} {contact.last_name}</div>
                    <div className="text-xs text-gray-500">{contact.email}</div>
                  </div>
                  {isAlreadyAdded && <span className="ml-auto text-xs text-green-600 font-medium">Already Added</span>}
                </label>
              );
            })}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowAddLeads(false)}>Cancel</Button>
            <Button onClick={handleAddLeads} disabled={selectedContacts.length === 0}>
              Add {selectedContacts.length} Leads
            </Button>
          </div>
        </Card>
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

      {/* Leads List */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Campaign Leads</h3>
          <span className="flex items-center text-xs text-gray-500 gap-1">
             <RefreshCw className="w-3 h-3 animate-spin" /> Live Updating
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Contact</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 font-medium text-gray-500">Generation</th>
                <th className="px-6 py-3 font-medium text-gray-500">Timeline</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No leads added yet.</td></tr>
              ) : (
                leads?.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{lead.first_name || 'Unknown'}</div>
                      <div className="text-gray-500 text-xs">{lead.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-6 py-4">
                       {/* Generation Status Pill */}
                       {lead.generation_status === 'ready' ? (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                           Ready
                         </span>
                       ) : lead.generation_status === 'failed' ? (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                           Failed
                         </span>
                       ) : (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                           {lead.generation_status || 'Pending'}
                         </span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 space-y-1">
                      {lead.email_sent_at && (
                        <div>Sent: {format(new Date(lead.email_sent_at + 'Z'), 'p')}</div>
                      )}
                      {lead.status === 'waiting_follow_up' && lead.follow_up_scheduled_for && (
                        <div className="text-purple-600 font-medium">
                          Follow-up: {format(new Date(lead.follow_up_scheduled_for + 'Z'), 'p')}
                        </div>
                      )}
                      {lead.replied_at && (
                        <div className="text-green-600 font-bold">
                          Replied: {format(new Date(lead.replied_at + 'Z'), 'p')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {/* PREVIEW BUTTON */}
                       <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setPreviewLeadId(lead.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" /> Preview
                      </Button>

                      {/* SIMULATE REPLY BUTTON */}
                      {['sent', 'waiting_follow_up'].includes(lead.status) && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleSimulateReply(lead.id)}
                          disabled={simulating === lead.id}
                        >
                          <Reply className="w-3 h-3 mr-1" />
                          {simulating === lead.id ? 'Marking...' : 'Simulate Reply'}
                        </Button>
                      )}

                        {/* Quick Regenerate */}
                        {lead.status === 'pending' && lead.generation_status === 'failed' && (
                            <Button 
                                size="sm" 
                                variant="danger" 
                                className="h-8 w-8 p-0"
                                onClick={() => setPreviewLeadId(lead.id)}
                                title="Regenerate"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Preview Modal */}
      {previewLeadId && id && campaign && (
         <PreviewEmailModal 
           campaignId={id} 
           leadId={previewLeadId} 
           aiPrompt={campaign.ai_prompt}
           onClose={() => setPreviewLeadId(null)}
           onSave={loadData}
         />
      )}
    </Layout>
  );
}
