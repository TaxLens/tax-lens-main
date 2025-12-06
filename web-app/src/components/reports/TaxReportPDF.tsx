'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { TAX_RELIEF_CATEGORIES, PERSONAL_RELIEF, calculateTax, calculateEPF, EPF_RELIEF_LIMIT, formatTaxBracket } from '@/lib/utils';

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  yearBadge: {
    fontSize: 14,
    color: '#3b82f6',
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: '48%',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  summaryValueHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  summaryValueGreen: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fafafa',
  },
  tableCell: {
    fontSize: 9,
    color: '#4b5563',
  },
  tableCellBold: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  col1: { width: '35%' },
  col2: { width: '20%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '25%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  deductionBreakdown: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  deductionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  deductionLabel: {
    fontSize: 10,
    color: '#4b5563',
  },
  deductionValue: {
    fontSize: 10,
    color: '#1f2937',
  },
  deductionTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
  },
  deductionTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  deductionTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
});

// Format currency for PDF
function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface ReliefData {
  [key: string]: {
    name: string;
    amount: number;
    limit: number;
    remaining: number;
  };
}

interface TaxReportPDFProps {
  year: number;
  annualSalary: number;
  reliefData: ReliefData;
  totalTrackedRelief: number;
}

export function TaxReportPDF({ 
  year, 
  annualSalary, 
  reliefData,
  totalTrackedRelief 
}: TaxReportPDFProps) {
  const taxCalculation = calculateTax(annualSalary, totalTrackedRelief);
  const epfDetails = calculateEPF(annualSalary);
  const generatedDate = new Date().toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Get all categories with data
  const categoriesWithData = TAX_RELIEF_CATEGORIES
    .filter(cat => cat.value !== 'non_deductible' && cat.value !== 'individual')
    .map(cat => {
      const data = reliefData[cat.value];
      return {
        label: cat.label,
        claimed: data ? Math.min(data.amount, cat.limit) : 0,
        limit: cat.limit,
        remaining: data ? data.remaining : cat.limit,
      };
    });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>TaxLens Annual Tax Report</Text>
          <Text style={styles.subtitle}>Malaysian Personal Income Tax Summary</Text>
          <Text style={styles.yearBadge}>Year of Assessment {year}</Text>
        </View>

        {/* Tax Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Annual Gross Income</Text>
              <Text style={styles.summaryValue}>{formatRM(annualSalary)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Chargeable Income</Text>
              <Text style={styles.summaryValue}>{formatRM(taxCalculation.chargeableIncome)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Deductions</Text>
              <Text style={styles.summaryValueHighlight}>{formatRM(taxCalculation.totalDeductions)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Estimated Tax Payable</Text>
              <Text style={styles.summaryValue}>{formatRM(taxCalculation.taxPayable)}</Text>
            </View>
          </View>

          {/* Deduction Breakdown */}
          <View style={styles.deductionBreakdown}>
            <View style={styles.deductionRow}>
              <Text style={styles.deductionLabel}>Personal Relief</Text>
              <Text style={styles.deductionValue}>{formatRM(PERSONAL_RELIEF)}</Text>
            </View>
            <View style={styles.deductionRow}>
              <Text style={styles.deductionLabel}>EPF Relief (capped at RM 4,000)</Text>
              <Text style={styles.deductionValue}>{formatRM(epfDetails.epfTaxRelief)}</Text>
            </View>
            <View style={styles.deductionRow}>
              <Text style={styles.deductionLabel}>Tracked Expenses Relief</Text>
              <Text style={styles.deductionValue}>{formatRM(totalTrackedRelief)}</Text>
            </View>
            <View style={styles.deductionTotal}>
              <Text style={styles.deductionTotalLabel}>Total Deductions</Text>
              <Text style={styles.deductionTotalValue}>{formatRM(taxCalculation.totalDeductions)}</Text>
            </View>
          </View>
        </View>

        {/* Tax Rates Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Rate Information</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tax Bracket</Text>
              <Text style={styles.summaryValue}>{formatTaxBracket(taxCalculation.bracketInfo.bracketIndex)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Marginal Rate</Text>
              <Text style={styles.summaryValue}>{taxCalculation.bracketInfo.marginalRate}%</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Effective Tax Rate</Text>
              <Text style={styles.summaryValueGreen}>{taxCalculation.effectiveRate}%</Text>
            </View>
          </View>
        </View>

        {/* Relief Categories Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relief Breakdown by Category</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.col1]}>Category</Text>
              <Text style={[styles.tableHeaderCell, styles.col2]}>Claimed</Text>
              <Text style={[styles.tableHeaderCell, styles.col3]}>Limit</Text>
              <Text style={[styles.tableHeaderCell, styles.col4]}>Remaining</Text>
            </View>
            
            {/* EPF Row */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCellBold, styles.col1]}>EPF (KWSP) Contribution</Text>
              <Text style={[styles.tableCell, styles.col2]}>{formatRM(epfDetails.epfTaxRelief)}</Text>
              <Text style={[styles.tableCell, styles.col3]}>{formatRM(EPF_RELIEF_LIMIT)}</Text>
              <Text style={[styles.tableCell, styles.col4]}>{formatRM(EPF_RELIEF_LIMIT - epfDetails.epfTaxRelief)}</Text>
            </View>

            {/* Category Rows */}
            {categoriesWithData.map((cat, index) => (
              <View key={index} style={index % 2 === 0 ? styles.tableRowAlt : styles.tableRow}>
                <Text style={[styles.tableCellBold, styles.col1]}>{cat.label}</Text>
                <Text style={[styles.tableCell, styles.col2]}>{formatRM(cat.claimed)}</Text>
                <Text style={[styles.tableCell, styles.col3]}>{formatRM(cat.limit)}</Text>
                <Text style={[styles.tableCell, styles.col4]}>{formatRM(cat.remaining)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated by TaxLens on {generatedDate} • This is an estimate for reference only
          </Text>
          <Text style={styles.footerText}>
            Please consult a tax professional or refer to LHDN for official tax calculations
          </Text>
        </View>
      </Page>
    </Document>
  );
}

