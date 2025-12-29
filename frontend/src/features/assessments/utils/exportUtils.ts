// src/features/assessments/utils/exportUtils.ts

import { adminAssessmentsApi, type AdminSubmissionFilter } from '../api/adminAssessmentsApi';

/**
 * Export assessment data as CSV
 */
export const exportAssessmentDataAsCSV = async (
  filter?: AdminSubmissionFilter
): Promise<void> => {
  try {
    const blob = await adminAssessmentsApi.exportAssessmentData('csv', filter);
    downloadBlob(blob, `assessment-data-${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    console.error('Failed to export CSV:', error);
    throw error;
  }
};

/**
 * Export assessment data as Excel
 */
export const exportAssessmentDataAsExcel = async (
  filter?: AdminSubmissionFilter
): Promise<void> => {
  try {
    const blob = await adminAssessmentsApi.exportAssessmentData('excel', filter);
    downloadBlob(blob, `assessment-data-${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Failed to export Excel:', error);
    throw error;
  }
};

/**
 * Helper function to download a blob
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Convert assessment data to CSV format (client-side fallback)
 */
export const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ];

  return csvRows.join('\n');
};

/**
 * Download CSV data
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
};