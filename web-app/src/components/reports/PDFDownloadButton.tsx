'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { TaxReportPDF } from './TaxReportPDF';
import { Download, Loader2 } from 'lucide-react';

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
  return (
    <PDFDownloadLink
      document={
        <TaxReportPDF
          year={year}
          annualSalary={annualSalary}
          reliefData={reliefData}
          totalTrackedRelief={totalTrackedRelief}
        />
      }
      fileName={`TaxLens_Report_YA${year}.pdf`}
    >
      {({ loading }) => (
        <button
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-500/50 rounded-xl font-medium transition-colors text-white"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Report
            </>
          )}
        </button>
      )}
    </PDFDownloadLink>
  );
}

