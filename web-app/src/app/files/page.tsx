'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import { api, YearReceipts, ReceiptFile } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  FolderOpen,
  Folder,
  FileImage,
  Download,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  X,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';

export default function FilesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { isCollapsed: sidebarCollapsed } = useSidebar();

  const [yearData, setYearData] = useState<YearReceipts[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedReceipts, setSelectedReceipts] = useState<ReceiptFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.getFiles();
      setYearData(response.years);
      
      // Auto-select first year if available
      if (response.years.length > 0 && !selectedYear) {
        setSelectedYear(response.years[0].year);
        setSelectedReceipts(response.years[0].receipts);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }
    if (isAuthenticated) {
      fetchFiles();
    }
  }, [isAuthenticated, authLoading, router, fetchFiles]);

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    const yearReceipts = yearData.find((y) => y.year === year);
    setSelectedReceipts(yearReceipts?.receipts || []);
  };

  const handleDownload = async (year: number) => {
    setIsDownloading(true);
    try {
      const downloadUrl = api.getDownloadUrl(year);
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `receipts_${year}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalReceipts = yearData.reduce((sum, y) => sum + y.count, 0);

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
            <h1 className="text-3xl font-display font-bold mb-2">Receipt Files</h1>
            <p className="text-midnight-400">
              {totalReceipts} receipt{totalReceipts !== 1 ? 's' : ''} stored
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : yearData.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-midnight-800 rounded-full flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-midnight-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Receipts Yet</h3>
            <p className="text-midnight-400 mb-4">
              Scan receipts to see them organized here by year
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Year Folders Sidebar */}
            <div className="lg:col-span-1">
              <div className="glass-card p-4">
                <h3 className="text-sm font-medium text-midnight-400 mb-3">
                  Folders by Year
                </h3>
                <div className="space-y-2">
                  {yearData.map((year) => (
                    <button
                      key={year.year}
                      onClick={() => handleYearSelect(year.year)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                        selectedYear === year.year
                          ? 'bg-accent-500/20 border border-accent-500/30'
                          : 'bg-midnight-800/50 hover:bg-midnight-800 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {selectedYear === year.year ? (
                          <FolderOpen className="w-5 h-5 text-accent-400" />
                        ) : (
                          <Folder className="w-5 h-5 text-midnight-400" />
                        )}
                        <span className="font-medium">{year.year}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-midnight-400 bg-midnight-700 px-2 py-0.5 rounded-full">
                          {year.count}
                        </span>
                        <ChevronRight className="w-4 h-4 text-midnight-500" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Receipts Grid */}
            <div className="lg:col-span-3">
              {selectedYear && (
                <div className="glass-card p-6">
                  {/* Year Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-6 h-6 text-accent-400" />
                      <h2 className="text-xl font-semibold">{selectedYear}</h2>
                      <span className="text-sm text-midnight-400">
                        {selectedReceipts.length} receipt
                        {selectedReceipts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownload(selectedYear)}
                      disabled={isDownloading || selectedReceipts.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-500/50 rounded-xl text-white font-medium transition-colors"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Download All
                    </button>
                  </div>

                  {/* Receipts Grid */}
                  {selectedReceipts.length === 0 ? (
                    <div className="text-center py-12 text-midnight-400">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No receipts for this year</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {selectedReceipts.map((receipt) => (
                        <button
                          key={receipt.id}
                          onClick={() => setPreviewImage(receipt.receiptUrl)}
                          className="group relative aspect-[3/4] bg-midnight-800 rounded-xl overflow-hidden border border-midnight-700 hover:border-accent-500/50 transition-all"
                        >
                          <img
                            src={receipt.receiptUrl}
                            alt={receipt.merchant || 'Receipt'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236b7280"><path d="M4 5h16v14H4V5zm2 2v10h12V7H6zm3 3h6v1H9v-1zm0 3h6v1H9v-1z"/></svg>';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <p className="text-white text-sm font-medium truncate">
                                {receipt.merchant || 'Unknown'}
                              </p>
                              <p className="text-midnight-300 text-xs">
                                {receipt.amount
                                  ? formatCurrency(receipt.amount)
                                  : '-'}
                              </p>
                              <p className="text-midnight-400 text-xs">
                                {formatDate(receipt.transactionDate)}
                              </p>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Image Preview Modal */}
      {previewImage && (
        <>
          <div
            className="fixed inset-0 bg-black/80 z-50"
            onClick={() => setPreviewImage(null)}
          />
          <div className="fixed inset-4 md:inset-12 z-50 flex items-center justify-center">
            <div className="relative max-w-full max-h-full">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 p-2 text-white hover:text-midnight-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={previewImage}
                alt="Receipt preview"
                className="max-w-full max-h-[calc(100vh-8rem)] object-contain rounded-xl"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-midnight-800/80 backdrop-blur rounded-xl text-white text-sm font-medium hover:bg-midnight-700 transition-colors"
                >
                  Open Original
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

