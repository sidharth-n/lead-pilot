import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button, Card, StatusBadge } from '../components/ui';
import { campaignsApi } from '../api';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    // Defaults for easy testing
    from_name: 'John Doe',
    from_email: 'john@example.com',
    subject_template: 'Hi {{first_name}}!',
    body_template: 'Hello {{first_name}}, I saw you work at {{company}}. Lets connect.',
    follow_up_delay_minutes: 1, // Default 1 min for demo!
    follow_up_subject: 'Checking in',
    follow_up_body: 'Did you see my last email?'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { campaign } = await campaignsApi.create(formData) as { campaign: any };
      navigate(`/campaigns/${campaign.id}`);
    } catch (err: any) {
      alert('Failed to create campaign: ' + err.message);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 mt-1">Manage email sequences</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      {showCreate && (
        <Card className="mb-8 p-6 bg-blue-50 border-blue-100">
          <h2 className="text-lg font-semibold mb-4 text-blue-900">Create Campaign</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
              <input
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Q1 Outreach"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                <input
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={formData.from_name}
                  onChange={e => setFormData({ ...formData, from_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                <input
                  required
                  type="email"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={formData.from_email}
                  onChange={e => setFormData({ ...formData, from_email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message Template</label>
              <textarea
                required
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                value={formData.body_template}
                onChange={e => setFormData({ ...formData, body_template: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Use {'{{first_name}}'}, {'{{company}}'} variables</p>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center bg-white p-4 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Follow-up Delay</label>
                <p className="text-xs text-gray-500 mb-2">Wait time if no reply</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    value={formData.follow_up_delay_minutes}
                    onChange={e => setFormData({ ...formData, follow_up_delay_minutes: parseInt(e.target.value) })}
                  />
                  <span className="text-sm text-gray-600">minutes</span>
                </div>
              </div>
              <div className="text-sm text-blue-800 bg-blue-50 p-3 rounded">
                💡 Set to 1 minute for quick testing!
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit">Create Campaign</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200">
            No campaigns yet. Create one to get started!
          </div>
        ) : (
          campaigns.map(campaign => (
            <Link key={campaign.id} to={`/campaigns/${campaign.id}`}>
              <Card className="hover:border-blue-500 transition-colors p-6 group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                      {campaign.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <span>{campaign.from_email}</span>
                      <span>•</span>
                      <span>Follow-up: {campaign.follow_up_delay_minutes} mins</span>
                    </div>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </Layout>
  );
}
