import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, StatusBadge } from '../components/ui';
import { campaignsApi } from '../api';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Users, Mail } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ active: 0, total_leads: 0, sent_today: 0 });
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);

  useEffect(() => {
    // Mock stats for now or fetch real ones if endpoints exist
    // Just fetching campaigns for the list
    campaignsApi.list().then(data => {
      setRecentCampaigns(data.campaigns.slice(0, 3));
      setStats({
        active: data.campaigns.filter(c => c.status === 'active').length,
        total_leads: 0, // Need aggregation endpoint
        sent_today: 0   // Need aggregation endpoint
      });
    });
  }, []);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your outreach performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
          <div className="text-sm text-gray-500">Active Campaigns</div>
        </Card>
        
        <Card className="p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">--</div>
          <div className="text-sm text-gray-500">Total Leads</div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Mail className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">--</div>
          <div className="text-sm text-gray-500">Emails Sent Today</div>
        </Card>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Campaigns</h2>
      <div className="grid gap-4">
        {recentCampaigns.map(campaign => (
          <Link key={campaign.id} to={`/campaigns/${campaign.id}`}>
            <Card className="p-4 hover:border-blue-400 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">{campaign.name}</h3>
                  <div className="text-sm text-gray-500">{campaign.from_email}</div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={campaign.status} />
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {recentCampaigns.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
            No campaigns yet
          </div>
        )}
      </div>
    </Layout>
  );
}
