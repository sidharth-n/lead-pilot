import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, UserPlus, Reply, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button, Card, StatusBadge } from '../components/ui';
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
                <th className="px-6 py-3 font-medium text-gray-500">Timeline</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads?.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">No leads added yet.</td></tr>
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
                    <td className="px-6 py-4 text-xs text-gray-500 space-y-1">
                      {lead.email_sent_at && (
                        <div>Sent: {format(new Date(lead.email_sent_at), 'p')}</div>
                      )}
                      {lead.status === 'waiting_follow_up' && lead.follow_up_scheduled_for && (
                        <div className="text-purple-600 font-medium">
                          Follow-up: {format(new Date(lead.follow_up_scheduled_for), 'p')}
                        </div>
                      )}
                      {lead.replied_at && (
                        <div className="text-green-600 font-bold">
                          Replied: {format(new Date(lead.replied_at), 'p')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* SIMULATE REPLY BUTTON - CRITICAL FOR DEMO */}
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  );
}
