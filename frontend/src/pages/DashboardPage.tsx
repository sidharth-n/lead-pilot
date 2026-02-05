import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, StatusBadge } from '../components/ui';
import { campaignsApi } from '../api';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Users, Mail, MessageSquare } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ 
    active_campaigns: 0, 
    total_leads: 0, 
    emails_sent_today: 0,
    total_replies: 0 
  });
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, campaignData] = await Promise.all([
          campaignsApi.getStats(),
          campaignsApi.list()
        ]);
        setStats(statsData);
        setRecentCampaigns(campaignData.campaigns.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your outreach performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loading ? '...' : stats.active_campaigns}
          </div>
          <div className="text-sm text-gray-500">Active Campaigns</div>
        </Card>
        
        <Card className="p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loading ? '...' : stats.total_leads}
          </div>
          <div className="text-sm text-gray-500">Total Leads</div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Mail className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loading ? '...' : stats.emails_sent_today}
          </div>
          <div className="text-sm text-gray-500">Sent Today</div>
        </Card>

        <Card className="p-6 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loading ? '...' : stats.total_replies}
          </div>
          <div className="text-sm text-gray-500">Total Replies</div>
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
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start your first campaign</h3>
            <p className="text-gray-500 mb-4">Create a campaign to begin your outreach</p>
            <Link to="/campaigns">
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <ArrowRight className="w-4 h-4 mr-2" />
                Create Campaign
              </button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
