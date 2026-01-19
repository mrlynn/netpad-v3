/**
 * Template Exporter Utilities
 *
 * Functions for exporting templates and sample data in various formats.
 */

import { FormTemplate } from '@/types/formTemplate';
import { generateSampleData } from './sampleDataGenerator';

/**
 * Download a file with the given content
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export template definition as JSON
 */
export function exportTemplateAsJson(template: FormTemplate) {
  // Create a clean export object (remove runtime/UI-only properties)
  const exportData = {
    id: template.id,
    name: template.name,
    description: template.fullDescription,
    category: template.category,
    formType: template.formType,
    complexity: template.complexity,
    estimatedTime: template.estimatedTime,
    icon: template.icon,
    tags: template.tags,
    features: template.features,
    useCases: template.useCases,
    fieldConfigs: template.fieldConfigs,
    multiPage: template.multiPage,
    theme: template.theme,
    version: template.version,
    exportedAt: new Date().toISOString(),
    source: 'NetPad Template Gallery',
  };

  const json = JSON.stringify(exportData, null, 2);
  downloadFile(json, `${template.id}-template.json`, 'application/json');
}

/**
 * Export sample data as JSON
 */
export function exportSampleDataAsJson(template: FormTemplate, count: number = 25) {
  const sampleData = generateSampleData(template, count);

  const exportData = {
    templateId: template.id,
    templateName: template.name,
    recordCount: sampleData.length,
    exportedAt: new Date().toISOString(),
    records: sampleData,
  };

  const json = JSON.stringify(exportData, null, 2);
  downloadFile(json, `${template.id}-sample-data.json`, 'application/json');
}

/**
 * Export sample data as CSV
 */
export function exportSampleDataAsCsv(template: FormTemplate, count: number = 25) {
  const sampleData = generateSampleData(template, count);

  if (sampleData.length === 0) return;

  // Get all unique keys from records (excluding _id and complex objects)
  const allKeys = new Set<string>();
  sampleData.forEach((record) => {
    Object.keys(record).forEach((key) => {
      const value = record[key];
      // Skip complex objects that don't serialize well to CSV
      if (key !== '_id' && typeof value !== 'object') {
        allKeys.add(key);
      }
    });
  });

  const headers = Array.from(allKeys);

  // Build CSV rows
  const rows: string[] = [];

  // Header row
  rows.push(headers.map(escapeCsvField).join(','));

  // Data rows
  sampleData.forEach((record) => {
    const row = headers.map((header) => {
      const value = record[header];
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) return escapeCsvField(value.join('; '));
      return escapeCsvField(String(value));
    });
    rows.push(row.join(','));
  });

  const csv = rows.join('\n');
  downloadFile(csv, `${template.id}-sample-data.csv`, 'text/csv');
}

/**
 * Escape a field for CSV format
 */
function escapeCsvField(field: string): string {
  // If field contains comma, newline, or quote, wrap in quotes and escape existing quotes
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Export for MongoDB import (NDJSON format)
 */
export function exportForMongoImport(template: FormTemplate, count: number = 25) {
  const sampleData = generateSampleData(template, count);

  // MongoDB import expects newline-delimited JSON (NDJSON)
  const ndjson = sampleData
    .map((record) => {
      // Add proper MongoDB _id format
      const mongoRecord = {
        ...record,
        _id: { $oid: record._id },
        createdAt: { $date: record.createdAt },
      };
      return JSON.stringify(mongoRecord);
    })
    .join('\n');

  downloadFile(ndjson, `${template.id}-mongodb-import.json`, 'application/json');
}

/**
 * Create a NetPad package bundle (ZIP with template + sample data)
 * Note: This requires a ZIP library - for now, exports as combined JSON
 */
export function exportNetPadPackage(template: FormTemplate, count: number = 25) {
  const sampleData = generateSampleData(template, count);

  const packageData = {
    _netpadVersion: '1.0',
    exportedAt: new Date().toISOString(),
    template: {
      id: template.id,
      name: template.name,
      description: template.fullDescription,
      category: template.category,
      formType: template.formType,
      complexity: template.complexity,
      estimatedTime: template.estimatedTime,
      icon: template.icon,
      tags: template.tags,
      features: template.features,
      useCases: template.useCases,
      fieldConfigs: template.fieldConfigs,
      multiPage: template.multiPage,
      theme: template.theme,
      version: template.version,
    },
    sampleData: {
      recordCount: sampleData.length,
      records: sampleData,
    },
    readme: `
# ${template.name}

${template.fullDescription}

## Importing this Template

1. Go to NetPad Builder
2. Click "Import Template"
3. Select this .netpad file

## Sample Data

This package includes ${sampleData.length} sample records that you can use for testing.

To import the sample data:
1. Create a form from this template
2. Go to the form's Data tab
3. Click "Import Data"
4. Select this file and choose "Import Sample Data"

## Fields

${template.fieldConfigs
  .filter((f) => f.included && f.type !== 'sectionHeader')
  .map((f) => `- **${f.label}** (${f.type})${f.required ? ' *required*' : ''}`)
  .join('\n')}
    `.trim(),
  };

  const json = JSON.stringify(packageData, null, 2);
  downloadFile(json, `${template.id}.netpad`, 'application/json');
}
