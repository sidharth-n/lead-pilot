import { useEffect, useState } from 'react';
import { Plus, Search, Upload, Trash2, Users, X, ExternalLink } from 'lucide-react';
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
  
  // Selection state
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  
  // Detail modal state
  const [detailContact, setDetailContact] = useState<any | null>(null);

  // Expanded Form State
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    company: '',
    job_title: '',
    headline: '',
    linkedin_url: '',
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
      setFormData({ email: '', first_name: '', last_name: '', company: '', job_title: '', headline: '', linkedin_url: '' });
      fetchContacts();
    } catch (err: any) {
      alert('Failed to create contact: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) return;
    if (!confirm(`Delete ${selectedContacts.length} contact(s)? This cannot be undone.`)) return;
    
    setDeleting(true);
    try {
      const result = await contactsApi.bulkDelete(selectedContacts) as { deleted: number; skipped: number; errors?: string[] };
      if (result.errors && result.errors.length > 0) {
        alert(`Deleted ${result.deleted}, skipped ${result.skipped}.\n${result.errors.join('\n')}`);
      }
      setSelectedContacts([]);
      fetchContacts();
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleContactSelection = (id: string) => {
    if (selectedContacts.includes(id)) {
      setSelectedContacts(selectedContacts.filter(c => c !== id));
    } else {
      setSelectedContacts([...selectedContacts, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 mt-1">Manage your leads and prospects</p>
        </div>
        <div className="flex gap-2">
          {selectedContacts.length > 0 && (
            <Button 
              variant="outline" 
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleting ? 'Deleting...' : `Delete (${selectedContacts.length})`}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" /> Import CSV
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Contact
          </Button>
        </div>
      </div>

      {/* Expanded Add Contact Form */}
      {showAddForm && (
        <Card className="mb-8 p-6 bg-blue-50 border-blue-100">
          <h2 className="text-lg font-semibold mb-4 text-blue-900">New Contact</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Email, First Name, Last Name */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  required
                  type="email"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={formData.first_name}
                  onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={formData.last_name}
                  onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>
            
            {/* Row 2: Company, Job Title */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Acme Inc"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={formData.job_title}
                  onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="CEO"
                />
              </div>
            </div>
            
            {/* Row 3: Headline, LinkedIn */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                <input
                  type="text"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={formData.headline}
                  onChange={e => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="Building the future of AI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={formData.linkedin_url}
                  onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/johndoe"
                />
              </div>
            </div>
            
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button type="submit">Save Contact</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name, email, company, or job title..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Clean table with minimal columns - page-level scroll */}
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-12">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={filteredContacts.length > 0 && selectedContacts.length === filteredContacts.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 font-medium text-gray-500">Company</th>
              <th className="px-4 py-3 font-medium text-gray-500">Job Title</th>
              <th className="px-4 py-3 font-medium text-gray-500">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-gray-600 font-medium mb-2">No contacts yet</p>
                    <p className="text-gray-400 text-sm mb-4">Import from CSV or add manually</p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowImportModal(true)}>
                        <Upload className="w-4 h-4 mr-2" /> Import CSV
                      </Button>
                      <Button onClick={() => setShowAddForm(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Add Contact
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredContacts.map(contact => (
                <tr 
                  key={contact.id} 
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedContacts.includes(contact.id) ? 'bg-blue-50' : ''}`}
                  onClick={(e) => {
                    // Don't open detail if clicking checkbox
                    const target = e.target as HTMLInputElement;
                    if (target.type !== 'checkbox') {
                      setDetailContact(contact);
                    }
                  }}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => toggleContactSelection(contact.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {contact.first_name || contact.last_name ? (
                      `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{contact.email}</td>
                  <td className="px-4 py-3 text-gray-600">{contact.company || <span className="text-gray-400">-</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{contact.job_title || <span className="text-gray-400">-</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(contact.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
      
      {/* Detail Modal - Lemlist Style */}
      {detailContact && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setDetailContact(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {detailContact.first_name || detailContact.last_name ? (
                    `${detailContact.first_name || ''} ${detailContact.last_name || ''}`.trim()
                  ) : 'Contact Details'}
                </h2>
                <p className="text-sm text-gray-500">{detailContact.email}</p>
              </div>
              <button onClick={() => setDetailContact(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">First Name</label>
                  <p className="text-gray-900 mt-1">{detailContact.first_name || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Last Name</label>
                  <p className="text-gray-900 mt-1">{detailContact.last_name || '-'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                <p className="text-gray-900 mt-1 break-all">{detailContact.email}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Company</label>
                  <p className="text-gray-900 mt-1">{detailContact.company || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Job Title</label>
                  <p className="text-gray-900 mt-1">{detailContact.job_title || '-'}</p>
                </div>
              </div>
              
              {detailContact.headline && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Headline</label>
                  <p className="text-gray-900 mt-1">{detailContact.headline}</p>
                </div>
              )}
              
              {detailContact.linkedin_url && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">LinkedIn</label>
                  <a 
                    href={detailContact.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-1 break-all"
                  >
                    {detailContact.linkedin_url}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}
              
              <div className="pt-2 border-t">
                <label className="text-xs font-medium text-gray-500 uppercase">Added</label>
                <p className="text-gray-900 mt-1">{new Date(detailContact.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
