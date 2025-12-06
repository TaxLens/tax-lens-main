'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { TaxReportPDF } from './TaxReportPDF';
import { Download, Loader2, FileText, X, Eye } from 'lucide-react';

interface ReliefData {
  [key: string]: {
    name: string;
    amount: number;
    limit: number;
    remaining: number;
  };
}

interface PDFDownloadButtonProps {
  year: number;
  annualSalary: number;
  reliefData: ReliefData;
  totalTrackedRelief: number;
}

export function PDFDownloadButton({
  year,
  annualSalary,
  reliefData,
  totalTrackedRelief,
}: PDFDownloadButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = (
        <TaxReportPDF
          year={year}
          annualSalary={annualSalary}
          reliefData={reliefData}
          totalTrackedRelief={totalTrackedRelief}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `TaxLens_Report_YA${year}.pdf`;
      link.click();
    }
  };

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  return (
    <>
      <button
        onClick={generatePDF}
        disabled={isGenerating}
        className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-500/50 rounded-xl font-medium transition-colors text-white"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" />
            Preview Report
          </>
        )}
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-4xl h-[90vh] mx-4 bg-midnight-900 rounded-2xl border border-midnight-700 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-midnight-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Tax Report Preview</h2>
                  <p className="text-sm text-midnight-400">Year of Assessment {year}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-midnight-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-midnight-400" />
              </button>
            </div>

            {/* PDF Preview */}
            <div className="flex-1 bg-midnight-950 p-4 overflow-hidden">
              {pdfUrl && (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full rounded-lg border border-midnight-800"
                  title="Tax Report Preview"
                />
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-midnight-700">
              <button
                onClick={handleOpenInNewTab}
                className="flex items-center gap-2 px-4 py-2 bg-midnight-800 hover:bg-midnight-700 rounded-lg transition-colors text-white"
              >
                <Eye className="w-4 h-4" />
                Open in New Tab
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 rounded-xl font-medium transition-colors text-white"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
