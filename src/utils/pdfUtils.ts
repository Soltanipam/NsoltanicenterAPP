import jsPDF from 'jspdf';
import { englishToPersian } from './numberUtils';

// Persian font data for jsPDF
const VAZIRMATN_FONT_BASE64 = 'data:font/truetype;charset=utf-8;base64,AAEAAAAOAIAAAwBgT1MvMlVKUlAAAADsAAAAYGNtYXABIwFnAAABTAAAAFRnYXNwAAAAEAAAAaAAAAAIZ2x5ZgAAAAAAAagAAABgaGVhZAAMAAsAAAIIAAAANmhoZWEHsANuAAACQAAAACRobXR4DygAAAAAAmQAAAAUbG9jYQBAAEAAAAJ4AAAADG1heHABDwBgAAACiAAAACBuYW1lVUdOTwAAAqgAAAGGcG9zdAADAAAAAzAAAAAg';

interface TextOptions {
  fontSize?: number;
  fontStyle?: 'normal' | 'bold' | 'italic';
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
}

interface TextBoxOptions {
  borderColor?: [number, number, number];
  backgroundColor?: [number, number, number];
  borderWidth?: number;
}

// Create a new PDF document with Persian font support
export const createPersianPDF = (): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  try {
    // Add Persian font to jsPDF
    doc.addFileToVFS('Vazirmatn.ttf', VAZIRMATN_FONT_BASE64);
    doc.addFont('Vazirmatn.ttf', 'Vazirmatn', 'normal');
    doc.setFont('Vazirmatn');
  } catch (error) {
    console.warn('Could not load Persian font, falling back to default font');
    // Fallback to default font if Persian font fails to load
    doc.setFont('helvetica');
  }

  return doc;
};

// Add Persian text to PDF with proper RTL support
export const addPersianText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options: TextOptions = {}
): number => {
  const {
    fontSize = 12,
    fontStyle = 'normal',
    align = 'right',
    maxWidth
  } = options;

  try {
    doc.setFontSize(fontSize);
    
    // Set font style
    if (fontStyle === 'bold') {
      doc.setFont('Vazirmatn', 'bold');
    } else {
      doc.setFont('Vazirmatn', 'normal');
    }
  } catch (error) {
    // Fallback to default font
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
  }

  if (maxWidth) {
    // Split text into lines if maxWidth is specified
    const lines = doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.35; // Convert pt to mm approximately
    
    lines.forEach((line: string, index: number) => {
      doc.text(line, x, y + (index * lineHeight), { align });
    });
    
    return lines.length * lineHeight;
  } else {
    doc.text(text, x, y, { align });
    return fontSize * 0.35; // Return approximate height
  }
};

// Add English text to PDF (for numbers, technical data, etc.)
export const addEnglishText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options: TextOptions = {}
): number => {
  const {
    fontSize = 12,
    fontStyle = 'normal',
    align = 'left',
    maxWidth
  } = options;

  doc.setFontSize(fontSize);
  doc.setFont('helvetica', fontStyle);

  if (maxWidth) {
    const lines = doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.35;
    
    lines.forEach((line: string, index: number) => {
      doc.text(line, x, y + (index * lineHeight), { align });
    });
    
    return lines.length * lineHeight;
  } else {
    doc.text(text, x, y, { align });
    return fontSize * 0.35;
  }
};

// Add a text box with border
export const addTextBox = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: TextBoxOptions = {}
): void => {
  const {
    borderColor = [0, 0, 0],
    backgroundColor,
    borderWidth = 0.5
  } = options;

  // Set border properties
  doc.setLineWidth(borderWidth);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);

  // Fill background if specified
  if (backgroundColor) {
    doc.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]);
    doc.rect(x, y, width, height, 'FD'); // Fill and draw
  } else {
    doc.rect(x, y, width, height, 'S'); // Stroke only
  }

  // Add text if provided
  if (text) {
    const textX = x + 2; // Small padding
    const textY = y + height / 2 + 2; // Center vertically
    addPersianText(doc, text, textX, textY, { fontSize: 10 });
  }
};

// Helper function to add page numbers
export const addPageNumbers = (doc: jsPDF): void => {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageText = `صفحه ${englishToPersian(i.toString())} از ${englishToPersian(pageCount.toString())}`;
    addPersianText(doc, pageText, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, {
      align: 'center',
      fontSize: 8
    });
  }
};

// Helper function to add header with company info
export const addCompanyHeader = (doc: jsPDF, title: string): number => {
  let currentY = 20;

  // Main title
  addPersianText(doc, title, doc.internal.pageSize.width / 2, currentY, {
    align: 'center',
    fontSize: 16,
    fontStyle: 'bold'
  });
  currentY += 10;

  // Company name
  addPersianText(doc, 'سلطانی سنتر', doc.internal.pageSize.width / 2, currentY, {
    align: 'center',
    fontSize: 14,
    fontStyle: 'bold'
  });
  currentY += 8;

  // Company slogan
  addPersianText(doc, 'برترین‌ها برای بهترین‌ها', doc.internal.pageSize.width / 2, currentY, {
    align: 'center',
    fontSize: 10
  });
  currentY += 15;

  // Separator line
  doc.setLineWidth(0.5);
  doc.line(20, currentY, doc.internal.pageSize.width - 20, currentY);
  currentY += 10;

  return currentY;
};

// Helper function to format Persian date and time
export const addDateTimeInfo = (doc: jsPDF, y: number): void => {
  const now = new Date();
  const persianDate = new Intl.DateTimeFormat('fa-IR').format(now);
  const time = now.toLocaleTimeString('fa-IR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  addPersianText(doc, `تاریخ: ${persianDate}`, 20, y, { fontSize: 9 });
  addPersianText(doc, `ساعت: ${time}`, 120, y, { fontSize: 9 });
};

export default {
  createPersianPDF,
  addPersianText,
  addEnglishText,
  addTextBox,
  addPageNumbers,
  addCompanyHeader,
  addDateTimeInfo
};