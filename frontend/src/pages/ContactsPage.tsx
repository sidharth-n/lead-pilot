import { useEffect, useState } from 'react';
import { Plus, Search, Upload } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button, Card } from '../components/ui';
import { contactsApi } from '../api';
import { ImportLeadsModal } from '../components/ImportLeadsModal';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    company: '',
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const data = await contactsApi.list();
      setContacts(data.contacts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await contactsApi.create(formData);
      setShowAddForm(false);
      setFormData({ email: '', first_name: '', company: '' });
      fetchContacts();
    } catch (err: any) {
      alert('Failed to create contact: ' + err.message);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.first_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 mt-1">Manage your leads and prospects</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" /> Import CSV
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Contact
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card className="mb-8 p-6 bg-blue-50 border-blue-100">
          <h2 className="text-lg font-semibold mb-4 text-blue-900">New Contact</h2>
          <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                required
                type="email"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search contacts..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 font-medium text-gray-500">Email</th>
                <th className="px-6 py-3 font-medium text-gray-500">Company</th>
                <th className="px-6 py-3 font-medium text-gray-500">Date Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : filteredContacts.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No contacts found</td></tr>
              ) : (
                filteredContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{contact.first_name || '-'} {contact.last_name || ''}</td>
                    <td className="px-6 py-4 text-gray-600">{contact.email}</td>
                    <td className="px-6 py-4 text-gray-600">{contact.company || '-'}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {showImportModal && (
        <ImportLeadsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchContacts();
          }}
        />
      )}
    </Layout>
  );
}
