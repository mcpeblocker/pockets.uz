import { createWorker } from 'tesseract.js';

export interface ExtractedReceiptData {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  items: string[];
  rawText: string;
}

/**
 * Perform OCR on a receipt image and extract expense data
 */
export async function scanReceipt(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<ExtractedReceiptData> {
  let worker = null;
  
  try {
    console.log('Creating Tesseract worker...');
    
    // Create worker with language directly (v5+ API)
    // Language is passed directly to createWorker, no need for loadLanguage/initialize
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        console.log('Tesseract log:', m.status, m.progress);
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress || 0);
        }
      },
    });

    console.log('Worker created and initialized, starting recognition...');

    // Perform OCR
    const { data: { text } } = await worker.recognize(imageFile);
    
    console.log('OCR completed, extracted text length:', text.length);

    // Clean up worker
    await worker.terminate();
    worker = null;

    const extractedData = parseReceiptText(text);

    return {
      ...extractedData,
      rawText: text,
    };
  } catch (error) {
    console.error('OCR Error:', error);
    
    // Clean up worker on error
    if (worker) {
      try {
        await worker.terminate();
      } catch (terminateError) {
        console.error('Error terminating worker:', terminateError);
      }
    }
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('worker')) {
        throw new Error('Failed to initialize OCR. Please refresh the page and try again.');
      }
      throw new Error(`OCR Error: ${error.message}`);
    }
    
    throw new Error('Failed to scan receipt. Please try again or enter manually.');
  }
}

/**
 * Parse OCR text to extract expense information
 */
function parseReceiptText(text: string): Omit<ExtractedReceiptData, 'rawText'> {
  const result: Omit<ExtractedReceiptData, 'rawText'> = {
    amount: null,
    date: null,
    merchant: null,
    items: [],
  };

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Extract amount (look for currency patterns)
  const amountPatterns = [
    /(?:total|amount|sum|balance|due|paid|grand\s+total)[\s:]*\$?([\d,]+\.?\d*)/gi,
    /\$([\d,]+\.?\d{2})/g,
    /([\d,]+\.\d{2})/g,
  ];

  const foundAmounts: number[] = [];

  for (const pattern of amountPatterns) {
    // Ensure pattern is global for matchAll
    const globalPattern = pattern.global ? pattern : new RegExp(pattern.source, pattern.flags + 'g');
    const matches = text.matchAll(globalPattern);
    for (const match of matches) {
      const numStr = match[1] || match[0];
      const cleaned = numStr.replace(/[^0-9.]/g, '');
      const amount = parseFloat(cleaned);
      if (!isNaN(amount) && amount > 0 && amount < 100000) {
        foundAmounts.push(amount);
      }
    }
  }

  if (foundAmounts.length > 0) {
    // Use the largest amount (likely the total)
    result.amount = Math.max(...foundAmounts);
  }

  // Extract date (look for common date patterns)
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s,]+(\d{1,2})[\s,]+(\d{2,4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1] || match[0];
      // Try to parse and format the date
      try {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          result.date = parsedDate.toISOString().split('T')[0];
        } else {
          result.date = dateStr;
        }
      } catch {
        result.date = dateStr;
      }
      break;
    }
  }

  // Extract merchant name (usually first few lines)
  const merchantKeywords = ['store', 'restaurant', 'merchant', 'company', 'inc', 'llc', 'ltd', 'market', 'shop'];
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].toLowerCase();
    if (line.length > 3 && line.length < 50 && !line.match(/^\d/)) {
      if (merchantKeywords.some(keyword => line.includes(keyword)) || i === 0) {
        result.merchant = lines[i];
        break;
      }
    }
  }

  // Extract items (lines that look like product descriptions)
  lines.forEach(line => {
    // Skip lines that are clearly not items
    if (
      line.match(/^(total|subtotal|tax|date|receipt|thank|change|cash|card|visa|mastercard)/i) ||
      line.match(/^\$?[\d,]+\.?\d*$/) ||
      line.length < 3 ||
      line.length > 100
    ) {
      return;
    }
    
    // If line looks like an item (has text and possibly a price)
    if (line.match(/[a-zA-Z]{3,}/) && line.length > 5) {
      result.items.push(line);
    }
  });

  // Limit items to first 10
  result.items = result.items.slice(0, 10);

  return result;
}
