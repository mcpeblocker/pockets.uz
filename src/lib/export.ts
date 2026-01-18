import { Event, Participant, Expense, Settlement, ExpenseCategory } from './types';
import { formatCurrency } from './currency';

export interface ExportData {
  event: Event;
  participants: Participant[];
  expenses: Expense[];
  settlements: Settlement[];
  categories?: ExpenseCategory[];
}

/**
 * Export event data to CSV format
 */
export function exportToCSV(data: ExportData): string {
  const lines: string[] = [];
  
  // Event header
  lines.push(`Event: ${data.event.title}`);
  lines.push(`Description: ${data.event.description || 'N/A'}`);
  lines.push(`Status: ${data.event.status}`);
  lines.push(`Currency: ${data.event.currency}`);
  lines.push(`Created: ${new Date(data.event.created_at).toLocaleDateString()}`);
  lines.push('');
  
  // Participants
  lines.push('=== PARTICIPANTS ===');
  lines.push('Name,Email,Payment Status');
  data.participants.forEach(p => {
    lines.push(`"${p.name}","${p.email || 'N/A'}",${p.payment_status}`);
  });
  lines.push('');
  
  // Expenses
  lines.push('=== EXPENSES ===');
  lines.push('Date,Description,Amount,Paid By,Category');
  data.expenses.forEach(e => {
    const paidBy = data.participants.find(p => p.id === e.paid_by_participant_id);
    const category = data.categories?.find(c => c.id === e.category_id);
    const date = e.expense_date ? new Date(e.expense_date).toLocaleDateString() : 'N/A';
    lines.push(
      `"${date}","${e.description}",${formatCurrency(e.amount, e.currency || data.event.currency)},"${paidBy?.name || 'Unknown'}","${category?.name || 'N/A'}"`
    );
  });
  lines.push('');
  
  // Summary
  const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const sharePerPerson = data.participants.length > 0 ? totalExpenses / data.participants.length : 0;
  lines.push('=== SUMMARY ===');
  lines.push(`Total Expenses,${formatCurrency(totalExpenses, data.event.currency)}`);
  lines.push(`Number of Participants,${data.participants.length}`);
  lines.push(`Per Person Share,${formatCurrency(sharePerPerson, data.event.currency)}`);
  lines.push('');
  
  // Settlements
  if (data.settlements.length > 0) {
    lines.push('=== SETTLEMENTS ===');
    lines.push('From,To,Amount');
    data.settlements.forEach(s => {
      lines.push(`"${s.from_name}","${s.to_name}",${formatCurrency(s.amount, data.event.currency)}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Generate a simple text report
 */
export function generateTextReport(data: ExportData): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push(`  ${data.event.title.toUpperCase()}`);
  lines.push('='.repeat(60));
  lines.push('');
  
  if (data.event.description) {
    lines.push(`Description: ${data.event.description}`);
    lines.push('');
  }
  
  lines.push(`Status: ${data.event.status.toUpperCase()}`);
  lines.push(`Currency: ${data.event.currency}`);
  lines.push(`Created: ${new Date(data.event.created_at).toLocaleDateString()}`);
  lines.push('');
  lines.push('-'.repeat(60));
  lines.push('');
  
  // Participants
  lines.push('PARTICIPANTS:');
  data.participants.forEach((p, i) => {
    lines.push(`  ${i + 1}. ${p.name}${p.email ? ` (${p.email})` : ''} - ${p.payment_status}`);
  });
  lines.push('');
  lines.push('-'.repeat(60));
  lines.push('');
  
  // Expenses
  lines.push('EXPENSES:');
  const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  data.expenses.forEach((e, i) => {
    const paidBy = data.participants.find(p => p.id === e.paid_by_participant_id);
    const category = data.categories?.find(c => c.id === e.category_id);
    const date = e.expense_date ? new Date(e.expense_date).toLocaleDateString() : 'N/A';
    lines.push(`  ${i + 1}. ${e.description}`);
    lines.push(`     Amount: ${formatCurrency(e.amount, e.currency || data.event.currency)}`);
    lines.push(`     Date: ${date}`);
    lines.push(`     Paid by: ${paidBy?.name || 'Unknown'}`);
    if (category) {
      lines.push(`     Category: ${category.name}`);
    }
    lines.push('');
  });
  lines.push('-'.repeat(60));
  lines.push('');
  
  // Summary
  const sharePerPerson = data.participants.length > 0 ? totalExpenses / data.participants.length : 0;
  lines.push('SUMMARY:');
  lines.push(`  Total Expenses: ${formatCurrency(totalExpenses, data.event.currency)}`);
  lines.push(`  Number of Participants: ${data.participants.length}`);
  lines.push(`  Per Person Share: ${formatCurrency(sharePerPerson, data.event.currency)}`);
  lines.push('');
  
  // Settlements
  if (data.settlements.length > 0) {
    lines.push('-'.repeat(60));
    lines.push('');
    lines.push('SETTLEMENTS:');
    data.settlements.forEach((s, i) => {
      lines.push(`  ${i + 1}. ${s.from_name} pays ${s.to_name}: ${formatCurrency(s.amount, data.event.currency)}`);
    });
  }
  
  lines.push('');
  lines.push('='.repeat(60));
  lines.push(`Generated on ${new Date().toLocaleString()}`);
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}

/**
 * Download file helper
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
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
 * Export to CSV and trigger download
 */
export function exportEventToCSV(data: ExportData) {
  const csv = exportToCSV(data);
  const filename = `${data.event.slug}-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export to text report and trigger download
 */
export function exportEventToText(data: ExportData) {
  const report = generateTextReport(data);
  const filename = `${data.event.slug}-report-${new Date().toISOString().split('T')[0]}.txt`;
  downloadFile(report, filename, 'text/plain');
}
