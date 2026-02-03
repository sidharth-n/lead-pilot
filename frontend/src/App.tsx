import { Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ContactsPage from './pages/ContactsPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/contacts" element={<ContactsPage />} />
      <Route path="/campaigns" element={<CampaignsPage />} />
      <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
    </Routes>
  );
}

export default App;
