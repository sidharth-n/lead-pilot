import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, Check, RefreshCw, Download } from 'lucide-react';
import { Button, Card } from './ui';
import { contactsApi } from '../api';

interface ImportLeadsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportLeadsModal({ onClose, onSuccess }: ImportLeadsModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'result'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    email: '',
    first_name: '',
    last_name: '',
    company: '',
    job_title: '',
    headline: '',
    phone_number: '',
    website_url: '',
    location: '',
    linkedin_url: ''
  });
  const [results, setResults] = useState<{ imported: number; skipped: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      Papa.parse(selected, {
        header: true,
        preview: 3, // Just get first few rows for mapping
        complete: (results) => {
          setHeaders(results.meta.fields || []);
          setPreviewData(results.data);
          
          // Auto-guess mapping (Prosp.ai compatible)
          const newMapping = { ...mapping };
          const fields = results.meta.fields || [];
          
          fields.forEach(field => {
            const lower = field.toLowerCase();
            if (lower.includes('email')) newMapping.email = field;
            else if (lower === 'name' || lower.includes('first') || lower.includes('given')) newMapping.first_name = field;
            else if (lower.includes('last') || lower.includes('sur')) newMapping.last_name = field;
            else if (lower.includes('company') || lower.includes('org')) newMapping.company = field;
            else if (lower.includes('jobtitle') || lower.includes('job_title') || lower.includes('title') || lower.includes('position')) newMapping.job_title = field;
            else if (lower.includes('headline')) newMapping.headline = field;
            else if (lower.includes('phone')) newMapping.phone_number = field;
            else if (lower.includes('website') || lower.includes('url') && !lower.includes('linkedin')) newMapping.website_url = field;
            else if (lower.includes('location')) newMapping.location = field;
            else if (lower.includes('linkedin') || lower.includes('profile')) newMapping.linkedin_url = field;
          });
          setMapping(newMapping);
          setStep('mapping');
        }
      });
    }
  };

  const handleImport = () => {
    if (!file) return;
    setStep('importing');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const payload = results.data.map((row: any) => ({
          email: row[mapping.email],
          first_name: row[mapping.first_name],
          last_name: row[mapping.last_name],
          company: row[mapping.company],
          job_title: row[mapping.job_title],
          headline: row[mapping.headline],
          phone_number: row[mapping.phone_number],
          website_url: row[mapping.website_url],
          location: row[mapping.location],
          linkedin_url: row[mapping.linkedin_url],
          custom_data: row // Keep original data too
        })).filter((c: any) => c.email); // Must have email

        try {
          // Send in chunks of 500 if needed, but for now just send all
          const response = await contactsApi.bulkImport(payload);
          setResults(response as any);
          setStep('result');
        } catch (error) {
          alert('Import failed: ' + error);
          setStep('mapping');
        }
      }
    });
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Import Leads from CSV</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'upload' && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Click to upload or drag and drop your CSV file</p>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              Select CSV File
            </Button>
            <div className="mt-6 pt-4 border-t">
              <a 
                href="/lead-template.csv" 
                download="lead-template.csv"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <Download className="w-4 h-4" />
                Download CSV Template
              </a>
              <p className="text-xs text-gray-400 mt-1">Compatible with Prosp.ai exports</p>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
             <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 mb-4">
              We found {headers.length} columns. Please map them to LeadPilot fields.
            </div>
            
            <div className="grid gap-3 max-h-80 overflow-y-auto">
              {[
                { label: 'Email Address *', key: 'email', required: true },
                { label: 'Name / First Name', key: 'first_name' },
                { label: 'Last Name', key: 'last_name' },
                { label: 'Company', key: 'company' },
                { label: 'Job Title', key: 'job_title' },
                { label: 'Headline', key: 'headline' },
                { label: 'Phone Number', key: 'phone_number' },
                { label: 'Website URL', key: 'website_url' },
                { label: 'Location', key: 'location' },
                { label: 'LinkedIn URL', key: 'linkedin_url' },
              ].map((field) => (
                <div key={field.key} className="grid grid-cols-2 items-center gap-4 border-b pb-3 last:border-0">
                  <label className="font-medium text-gray-700 text-sm">
                    {field.label}
                  </label>
                  <select
                    className="p-2 border rounded-md text-sm"
                    value={mapping[field.key as keyof typeof mapping]}
                    onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                  >
                    <option value="">-- Ignore --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h} (ex: {previewData[0]?.[h]?.substring?.(0, 20) || 'empty'})</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={handleImport} disabled={!mapping.email}>
                Import Contacts
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-lg font-medium">Importing your contacts...</p>
          </div>
        )}

        {step === 'result' && results && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Import Complete!</h3>
            <p className="text-gray-600 mb-6">
              Successfully imported <span className="font-bold text-green-600">{results.imported}</span> contacts.
              <br />
              {results.skipped > 0 && (
                <span className="text-orange-500">Skipped {results.skipped} duplicates or invalid rows.</span>
              )}
            </p>
            
            {results.errors && results.errors.length > 0 && (
              <div className="text-left bg-red-50 p-4 rounded-lg mb-6 max-h-40 overflow-y-auto text-sm text-red-700">
                <strong>Errors:</strong>
                <ul className="list-disc pl-4 mt-2">
                  {results.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={onSuccess}>Done</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
