'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import { api, TaxDocument } from '@/lib/api';
import {
  Upload,
  FileText,
  Trash2,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Database,
  Zap,
} from 'lucide-react';

export default function TaxRulesAdminPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { isCollapsed: sidebarCollapsed } = useSidebar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<{ pineconeConfigured: boolean; openaiConfigured: boolean } | null>(null);
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadYear, setUploadYear] = useState<number>(new Date().getFullYear());
  const [uploadDescription, setUploadDescription] = useState('');

  // Query test state
  const [testQuery, setTestQuery] = useState('');
  const [testYear, setTestYear] = useState<number | undefined>(undefined);
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statusRes, docsRes] = await Promise.all([
        api.getTaxDocumentsStatus(),
        api.listTaxDocuments(),
      ]);
      setStatus(statusRes);
      setDocuments(docsRes.documents);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, authLoading, router, fetchData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Uploading and processing document...');
    setError(null);
    setSuccess(null);

    try {
      const result = await api.uploadTaxDocument(
        selectedFile,
        uploadYear,
        uploadDescription || undefined
      );

      setSuccess(`Document uploaded successfully! ${result.chunkCount} chunks indexed.`);
      setSelectedFile(null);
      setUploadDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh documents list
      const docsRes = await api.listTaxDocuments();
      setDocuments(docsRes.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleDelete = async (documentId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This will remove all indexed content.`)) {
      return;
    }

    try {
      await api.deleteTaxDocument(documentId);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      setSuccess('Document deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const handleTestQuery = async () => {
    if (!testQuery.trim()) {
      setError('Please enter a query');
      return;
    }

    setIsQuerying(true);
    setQueryResult(null);
    setError(null);

    try {
      const result = await api.queryTaxRules(testQuery, testYear);
      setQueryResult(result.context);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query');
    } finally {
      setIsQuerying(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen mesh-bg">
      <Sidebar />

      <main
        className={`p-8 transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        } ml-0 pt-16 md:pt-8`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Tax Rules Management</h1>
            <p className="text-midnight-400">
              Upload official tax documents to improve transaction categorization
            </p>
          </div>
        </div>

        {/* Status Cards */}
        {status && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="glass-card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                status.pineconeConfigured ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                <Database className={`w-5 h-5 ${status.pineconeConfigured ? 'text-green-400' : 'text-red-400'}`} />
              </div>
              <div>
                <p className="font-medium">Pinecone Vector DB</p>
                <p className={`text-sm ${status.pineconeConfigured ? 'text-green-400' : 'text-red-400'}`}>
                  {status.pineconeConfigured ? 'Connected' : 'Not Configured'}
                </p>
              </div>
            </div>
            <div className="glass-card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                status.openaiConfigured ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                <Zap className={`w-5 h-5 ${status.openaiConfigured ? 'text-green-400' : 'text-red-400'}`} />
              </div>
              <div>
                <p className="font-medium">OpenAI Embeddings</p>
                <p className={`text-sm ${status.openaiConfigured ? 'text-green-400' : 'text-red-400'}`}>
                  {status.openaiConfigured ? 'Connected' : 'Not Configured'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-green-400">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {!status?.pineconeConfigured || !status?.openaiConfigured ? (
          <div className="glass-card p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-400" />
              <h2 className="text-lg font-semibold">Configuration Required</h2>
            </div>
            <p className="text-midnight-400 mb-4">
              To use the RAG-based tax rules system, you need to configure the following environment variables:
            </p>
            <ul className="list-disc list-inside text-midnight-400 space-y-1">
              {!status?.pineconeConfigured && (
                <li><code className="text-accent-400">PINECONE_API_KEY</code> - Your Pinecone API key</li>
              )}
              {!status?.pineconeConfigured && (
                <li><code className="text-accent-400">PINECONE_INDEX</code> - Pinecone index name (default: taxlens-tax-rules)</li>
              )}
              {!status?.openaiConfigured && (
                <li><code className="text-accent-400">OPENAI_API_KEY</code> - OpenAI API key for embeddings</li>
              )}
            </ul>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-accent-400" />
                Upload Tax Document
              </h2>

              <div className="space-y-4">
                {/* File Input */}
                <div>
                  <label className="block text-sm text-midnight-400 mb-2">
                    PDF Document
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-midnight-700 rounded-xl hover:border-accent-500/50 transition-colors flex flex-col items-center gap-2"
                  >
                    <FileText className="w-8 h-8 text-midnight-400" />
                    {selectedFile ? (
                      <span className="text-accent-400">{selectedFile.name}</span>
                    ) : (
                      <span className="text-midnight-400">Click to select PDF</span>
                    )}
                  </button>
                </div>

                {/* Year Select */}
                <div>
                  <label className="block text-sm text-midnight-400 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Tax Year
                  </label>
                  <select
                    value={uploadYear}
                    onChange={(e) => setUploadYear(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-midnight-400 mb-2">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="e.g., LHDN Tax Relief Guidelines 2024"
                    className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                  />
                </div>

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full py-3 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-500/50 rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {uploadProgress}
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Upload & Index
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test Query Section */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-accent-400" />
                Test Query
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-midnight-400 mb-2">
                    Query
                  </label>
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="e.g., What is the limit for lifestyle relief?"
                    className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-midnight-400 mb-2">
                    Filter by Year (optional)
                  </label>
                  <select
                    value={testYear || ''}
                    onChange={(e) => setTestYear(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                  >
                    <option value="">All Years</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleTestQuery}
                  disabled={isQuerying || !testQuery.trim()}
                  className="w-full py-3 bg-midnight-700 hover:bg-midnight-600 disabled:bg-midnight-700/50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isQuerying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Search
                    </>
                  )}
                </button>

                {queryResult !== null && (
                  <div className="mt-4 p-4 bg-midnight-800 rounded-xl">
                    <label className="block text-sm text-midnight-400 mb-2">Results</label>
                    <pre className="text-sm text-midnight-200 whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {queryResult || 'No relevant tax rules found'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="glass-card p-6 mt-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent-400" />
            Indexed Documents
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent-400" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-midnight-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No documents indexed yet</p>
              <p className="text-sm">Upload a tax rules PDF to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-midnight-800/50 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-accent-400" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.filename}</p>
                      <div className="flex items-center gap-3 text-sm text-midnight-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {doc.year}
                        </span>
                        <span>{doc.chunk_count} chunks</span>
                        <span>
                          {new Date(doc.uploaded_at).toLocaleDateString('en-MY', {
                            dateStyle: 'medium',
                          })}
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-midnight-500 mt-1">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id, doc.filename)}
                    className="p-2 text-midnight-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

