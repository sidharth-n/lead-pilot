import { useState, useMemo } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { Button } from './ui';

interface AddLeadsModalProps {
  contacts: any[];
  existingLeadIds: string[]; // contact_ids already in campaign
  onClose: () => void;
  onAdd: (contactIds: string[]) => void;
}

const ITEMS_PER_PAGE = 20;

export function AddLeadsModal({ contacts, existingLeadIds, onClose, onAdd }: AddLeadsModalProps) {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c =>
      c.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contacts, searchTerm]);

  // Paginate
  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredContacts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredContacts, currentPage]);

  const toggleContact = (id: string) => {
    if (selectedContacts.includes(id)) {
      setSelectedContacts(selectedContacts.filter(c => c !== id));
    } else {
      setSelectedContacts([...selectedContacts, id]);
    }
  };

  const toggleSelectAll = () => {
    // Only select contacts that aren't already in campaign
    const selectableOnPage = paginatedContacts.filter(c => !existingLeadIds.includes(c.id));
    if (selectableOnPage.every(c => selectedContacts.includes(c.id))) {
      // Deselect all on current page
      setSelectedContacts(selectedContacts.filter(id => !selectableOnPage.find(c => c.id === id)));
    } else {
      // Select all on current page
      const newSelection = [...selectedContacts];
      selectableOnPage.forEach(c => {
        if (!newSelection.includes(c.id)) newSelection.push(c.id);
      });
      setSelectedContacts(newSelection);
    }
  };

  const handleAdd = () => {
    onAdd(selectedContacts);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Select Contacts to Add</h2>
            <p className="text-sm text-gray-500 mt-1">{filteredContacts.length} contacts available</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, email, company, or job title..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={paginatedContacts.filter(c => !existingLeadIds.includes(c.id)).every(c => selectedContacts.includes(c.id)) && paginatedContacts.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">NAME</th>
                <th className="px-4 py-3 font-medium text-gray-500">HEADLINE</th>
                <th className="px-4 py-3 font-medium text-gray-500">JOB TITLE</th>
                <th className="px-4 py-3 font-medium text-gray-500">COMPANY</th>
                <th className="px-4 py-3 font-medium text-gray-500">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500 mb-4">No contacts found</div>
                    <a 
                      href="/contacts" 
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Contacts First
                    </a>
                  </td>
                </tr>
              ) : (
                paginatedContacts.map(contact => {
                  const isAlreadyAdded = existingLeadIds.includes(contact.id);
                  const isSelected = selectedContacts.includes(contact.id);
                  
                  return (
                    <tr
                      key={contact.id}
                      className={`hover:bg-gray-50 transition-colors ${isSelected && !isAlreadyAdded ? 'bg-blue-50' : ''} ${isAlreadyAdded ? 'bg-gray-50 opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={isSelected}
                          onChange={() => toggleContact(contact.id)}
                          disabled={isAlreadyAdded}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {contact.first_name || contact.last_name ? (
                            `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{contact.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">
                        {contact.headline || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {contact.job_title || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {contact.company || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isAlreadyAdded ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            In Campaign
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Pagination */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)} of {filteredContacts.length} contacts
          </div>
          
          <div className="flex items-center gap-4">
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border border-gray-300 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded text-sm ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-100'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded border border-gray-300 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={selectedContacts.length === 0}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add {selectedContacts.length} Lead{selectedContacts.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
