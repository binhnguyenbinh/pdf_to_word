import * as pdfjsLib from 'pdfjs-dist';
import { PageData, PageOrientation } from '../types';

// Fix for ESM import of pdfjs-dist where exports might be on .default
const pdfjs = (pdfjsLib as any).default ?? pdfjsLib;

// Configure the worker
if (pdfjs.GlobalWorkerOptions) {
  // Use cdnjs for the worker to avoid importScripts errors with esm.sh redirects/headers
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove Data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Converts a PDF file into an array of PageData objects containing image and dimension info.
 */
export const convertPdfToImages = async (file: File): Promise<PageData[]> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Loading the document using the resolved pdfjs object
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const pages: PageData[] = [];
  const totalPages = pdf.numPages;

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    
    // Set scale to 2.0 for higher resolution (better OCR)
    // We check the viewport to determine orientation
    const viewport = page.getViewport({ scale: 2.0 });
    
    // Determine orientation based on dimensions
    const isLandscape = viewport.width > viewport.height;
    const orientation: PageOrientation = isLandscape ? 'landscape' : 'portrait';

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error("Could not create canvas context");
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    
    // Export to JPEG base64
    const base64Url = canvas.toDataURL('image/jpeg', 0.85);
    // Remove "data:image/jpeg;base64," prefix
    const base64 = base64Url.split(',')[1];
    
    pages.push({
      base64,
      pageIndex: i,
      orientation,
      width: viewport.width,
      height: viewport.height
    });
  }

  return pages;
};

export const exportToWord = (pages: PageData[], fileName: string) => {
  // To handle mixed orientation in Word (Portrait/Landscape), we need to use MSO styles
  // and explicit Section Breaks.
  
  let bodyContent = '';

  pages.forEach((page, index) => {
    // Determine margins based on Decree 30/2020/ND-CP roughly
    // Portrait: Top 2cm, Bottom 2cm, Left 3cm, Right 1.5cm
    // Landscape: Top 2cm, Bottom 2cm, Left 2cm, Right 2cm (simplified)
    const marginStyle = page.orientation === 'landscape' 
      ? 'margin: 2.0cm 2.0cm 2.0cm 2.0cm; size: 29.7cm 21.0cm; mso-page-orientation: landscape;' 
      : 'margin: 2.0cm 2.0cm 2.0cm 3.0cm; size: 21.0cm 29.7cm; mso-page-orientation: portrait;';

    // Add Section Break for Word (except potentially the first one, but doing it for all ensures style application)
    // The <br clear=all ...> is the magic trick for Word section breaks
    if (index > 0) {
      bodyContent += `
        <br clear=all style='mso-special-character:line-break; page-break-before:always'>
      `;
    }

    bodyContent += `
      <div class=Section${index + 1} style='${marginStyle}'>
        ${page.processedHtml || ''}
      </div>
    `;
  });

  // Generate CSS for sections
  let cssStyle = `
    <style>
      body { font-family: 'Times New Roman', serif; font-size: 14pt; }
      p { margin-top: 6pt; margin-bottom: 6pt; text-align: justify; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid black; padding: 5px; vertical-align: top; }
      .no-border td { border: none !important; }
      @page { mso-page-orientation: portrait; }
      ${pages.map((p, i) => `
        @page Section${i + 1} {
          size: ${p.orientation === 'landscape' ? '29.7cm 21.0cm' : '21.0cm 29.7cm'};
          margin: ${p.orientation === 'landscape' ? '2.0cm 2.0cm 2.0cm 2.0cm' : '2.0cm 2.0cm 2.0cm 3.0cm'};
          mso-header-margin: 35.4pt; 
          mso-footer-margin: 35.4pt; 
          mso-paper-source:0;
        }
        div.Section${i + 1} { page: Section${i + 1}; }
      `).join('')}
    </style>
  `;

  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>DocFormat VN Export</title>
      ${cssStyle}
    </head>
    <body>
  `;
  
  const footer = `</body></html>`;
  const sourceHTML = header + bodyContent + footer;

  const blob = new Blob(['\ufeff', sourceHTML], {
    type: 'application/msword'
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName.replace(/\.[^/.]+$/, "")}_formatted.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
