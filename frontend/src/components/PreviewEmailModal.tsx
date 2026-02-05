// frontend/src/components/PreviewEmailModal.tsx

import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Save, Sparkles, AlertCircle } from 'lucide-react';
import { Button, Card } from './ui';
import { generationApi } from '../api';
import { format } from 'date-fns';

interface PreviewEmailModalProps {
  campaignId: string;
  leadId: string;
  aiPrompt?: string; // Passed from parent
  onClose: () => void;
  onSave: () => void;
}

export function PreviewEmailModal({ campaignId: _campaignId, leadId, aiPrompt, onClose, onSave }: PreviewEmailModalProps) {
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [editedBody, setEditedBody] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedFollowUpBody, setEditedFollowUpBody] = useState('');
  const [editedFollowUpSubject, setEditedFollowUpSubject] = useState('');
  const [activeTab, setActiveTab] = useState<'initial' | 'followup'>('initial');
  
  // Polling ref
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    return () => stopPolling();
  }, [leadId]);

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  const loadData = async () => {
    try {
      const json = await generationApi.getLead(leadId);
      
      if (json.lead) {
        setData(json.lead);
        
        // If we are regenerating, check if status is ready
        if (regenerating && json.lead.generation_status === 'ready') {
          setRegenerating(false);
          stopPolling();
          // Update fields with new content
          setEditedSubject(json.lead.generated_subject || '');
          setEditedBody(json.lead.generated_body || '');
          setEditedFollowUpSubject(json.lead.generated_follow_up_subject || '');
          setEditedFollowUpBody(json.lead.generated_follow_up_body || '');
        } else if (!regenerating) {
           // Initial load
           setEditedSubject(json.lead.generated_subject || '');
           setEditedBody(json.lead.generated_body || '');
           setEditedFollowUpSubject(json.lead.generated_follow_up_subject || '');
           setEditedFollowUpBody(json.lead.generated_follow_up_body || '');
        }
        
        if (json.lead.generation_status === 'failed') {
          setRegenerating(false);
          stopPolling();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!regenerating) setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await generationApi.update(leadId, {
        generated_subject: editedSubject,
        generated_body: editedBody,
        generated_follow_up_subject: editedFollowUpSubject,
        generated_follow_up_body: editedFollowUpBody,
      });
      onSave(); // Refresh parent
      onClose();
    } catch (err) {
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('This will overwrite current content with a new AI generation. Continue?')) return;
    
    setRegenerating(true);
    try {
      await generationApi.regenerate(leadId);
      
      // Start polling
      pollInterval.current = setInterval(loadData, 2000);
      
    } catch (err) {
      alert('Failed to queue regeneration');
      setRegenerating(false);
    }
  };

  if (loading) {
     return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl bg-white p-12 text-center text-gray-500">
           <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
           Loading...
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-5xl bg-white p-0 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Preview & Edit Email
            </h2>
            <div className="text-sm text-gray-500 mt-1">
              Review the AI-generated content before sending
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Context & Prompt */}
          <div className="w-1/3 bg-gray-50 border-r border-gray-100 p-6 overflow-y-auto">
             <div className="mb-6">
               <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                 AI Instructions
               </label>
               <div className="bg-white p-3 rounded-md border border-gray-200 text-sm text-gray-700 italic">
                 "{aiPrompt || 'No specific AI prompt provided. Using template only.'}"
               </div>
             </div>

             <div className="mb-6">
               <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                 Generation Status
               </label>
               <div className="flex items-center gap-2 mb-2">
                 {regenerating ? (
                   <span className="flex items-center gap-2 text-indigo-600 font-medium animate-pulse">
                     <RefreshCw className="w-4 h-4 animate-spin" /> Generating...
                   </span>
                 ) : data?.generation_status === 'ready' ? (
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                     ✨ Ready to Send
                   </span>
                 ) : data?.generation_status === 'failed' ? (
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                     Failed
                   </span>
                 ) : (
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                     {data?.generation_status}
                   </span>
                 )}
               </div>
               
               {data?.last_error && (
                 <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-start gap-2">
                   <AlertCircle className="w-4 h-4 shrink-0" /> 
                   {data.last_error}
                 </div>
               )}

               {data?.updated_at && !regenerating && (
                 <div className="text-xs text-gray-400 mt-2">
                   Last generated: {format(new Date(data.updated_at), 'p')}
                 </div>
               )}
             </div>

             <Button 
               variant="outline" 
               className="w-full justify-center" 
               onClick={handleRegenerate}
               disabled={regenerating}
             >
               <RefreshCw className={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
               {regenerating ? 'Thinking...' : 'Regenerate Entire Email'}
             </Button>
          </div>

          {/* Main Content - Editor */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Tabs */}
            <div className="flex border-b px-6 pt-4">
              <button 
                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors mr-4 ${activeTab === 'initial' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('initial')}
              >
                Initial Email
              </button>
              <button 
                 className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'followup' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                 onClick={() => setActiveTab('followup')}
              >
                Follow-Up Email
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {regenerating ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Sparkles className="w-12 h-12 mb-4 text-indigo-300 animate-pulse" />
                  <p>AI is writing a new personal email...</p>
                </div>
              ) : activeTab === 'initial' ? (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Subject Line</label>
                    <input
                      type="text"
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-gray-900"
                      value={editedSubject}
                      onChange={e => setEditedSubject(e.target.value)}
                      placeholder="Email Subject"
                    />
                  </div>
                  <div className="flex-1">
                     <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email Body</label>
                    <textarea
                      className="w-full p-4 border border-gray-300 rounded-lg h-96 font-sans text-base leading-relaxed text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                      value={editedBody}
                      onChange={e => setEditedBody(e.target.value)}
                      placeholder="Hi [Name], ..."
                    />
                  </div>
                </div>
              ) : (
                 <div className="space-y-4 max-w-2xl mx-auto">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Follow-up Subject</label>
                    <input
                      type="text"
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-gray-900"
                      value={editedFollowUpSubject}
                      onChange={e => setEditedFollowUpSubject(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                     <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Follow-up Body</label>
                    <textarea
                      className="w-full p-4 border border-gray-300 rounded-lg h-96 font-sans text-base leading-relaxed text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                      value={editedFollowUpBody}
                      onChange={e => setEditedFollowUpBody(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || regenerating}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save & Approve'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
