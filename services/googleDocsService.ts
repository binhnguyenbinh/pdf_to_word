import { PageData } from '../types';

// Google OAuth configuration from environment variables
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const DISCOVERY_DOCS = ['https://docs.googleapis.com/$discovery/rest?version=v1'];
const SCOPES = 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file';

let gapiInited = false;
let gisInited = false;
let tokenClient: any;

/**
 * Initialize Google API
 */
export const initGoogleAPI = () => {
  if (!CLIENT_ID || !API_KEY) {
    console.warn('Google API credentials not configured');
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      (window as any).gapi.load('client', async () => {
        await (window as any).gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        resolve();
      });
    };
    document.body.appendChild(script);

    // Load GIS
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
      });
      gisInited = true;
    };
    document.body.appendChild(gisScript);
  });
};

/**
 * Sign in to Google
 */
export const signInGoogle = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!gisInited) {
      reject(new Error('Google Identity Services not initialized'));
      return;
    }

    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        reject(resp);
      } else {
        resolve();
      }
    };

    if ((window as any).gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

function parseStyle(styleStr: string): Record<string, string> {
  const styles: Record<string, string> = {};
  if (!styleStr) return styles;
  
  styleStr.split(';').forEach(rule => {
    const [key, value] = rule.split(':').map(s => s.trim());
    if (key && value) {
      styles[key] = value;
    }
  });
  return styles;
}

function ptToPoints(pt: string): number {
  return parseFloat(pt.replace('pt', ''));
}

/**
 * Create Google Doc from HTML content (simplified version)
 */
export const createGoogleDoc = async (pages: PageData[], fileName: string): Promise<string> => {
  try {
    if (!gapiInited) {
      throw new Error('Google API not initialized');
    }

    console.log('Creating Google Doc...');

    // Create new document
    const createResponse = await (window as any).gapi.client.docs.documents.create({
      title: fileName.replace(/\.[^/.]+$/, '') + ' - Formatted',
    });

    const documentId = createResponse.result.documentId;
    console.log('Document created:', documentId);

    // Build simple text content
    const requests: any[] = [];
    let currentIndex = 1;

    pages.forEach((page, pageIndex) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = page.processedHtml || '';
      
      // Get all paragraphs
      const paragraphs = tempDiv.querySelectorAll('p, div');
      
      paragraphs.forEach((p) => {
        const text = p.textContent?.trim();
        if (text) {
          const styles = parseStyle((p as HTMLElement).getAttribute('style') || '');
          const fontSize = ptToPoints(styles['font-size'] || '14pt');
          const textAlign = styles['text-align'] || 'left';
          const isBold = styles['font-weight'] === 'bold';
          
          // Insert text
          requests.push({
            insertText: {
              location: { index: currentIndex },
              text: text + '\n',
            },
          });

          // Format paragraph
          const alignment = textAlign === 'center' ? 'CENTER' : 
                           textAlign === 'right' ? 'END' : 
                           textAlign === 'justify' ? 'JUSTIFIED' : 'START';

          requests.push({
            updateParagraphStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + text.length + 1,
              },
              paragraphStyle: {
                alignment: alignment,
                lineSpacing: 150,
              },
              fields: 'alignment,lineSpacing',
            },
          });

          // Format text
          requests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + text.length,
              },
              textStyle: {
                fontSize: { magnitude: fontSize, unit: 'PT' },
                weightedFontFamily: { fontFamily: 'Times New Roman' },
                bold: isBold,
              },
              fields: 'fontSize,weightedFontFamily,bold',
            },
          });

          currentIndex += text.length + 1;
        }
      });

      // Add page break
      if (pageIndex < pages.length - 1) {
        requests.push({
          insertPageBreak: {
            location: { index: currentIndex },
          },
        });
        currentIndex += 1;
      }
    });

    console.log('Total requests:', requests.length);

    // Apply formatting in batches
    const batchSize = 100;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      console.log(`Applying batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);
      
      await (window as any).gapi.client.docs.documents.batchUpdate({
        documentId,
        requests: batch,
      });
    }

    console.log('Document formatted successfully');
    return `https://docs.google.com/document/d/${documentId}/edit`;
  } catch (error: any) {
    console.error('Error creating Google Doc:', error);
    console.error('Error details:', error.result?.error);
    throw new Error(error.result?.error?.message || error.message || 'Lỗi khi tạo Google Docs');
  }
};

/**
 * Copy HTML content for pasting into Google Docs
 */
export const copyForGoogleDocs = (pages: PageData[]): void => {
  let htmlContent = '';

  pages.forEach((page) => {
    htmlContent += page.processedHtml || '';
    htmlContent += '<br><br>';
  });

  // Create a temporary element
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  document.body.appendChild(tempDiv);

  // Select and copy
  const range = document.createRange();
  range.selectNodeContents(tempDiv);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  try {
    document.execCommand('copy');
    alert('Đã copy! Mở Google Docs và nhấn Ctrl+V (hoặc Cmd+V) để paste.');
  } catch (err) {
    console.error('Copy failed:', err);
    alert('Lỗi khi copy. Vui lòng thử lại.');
  }

  // Cleanup
  selection?.removeAllRanges();
  document.body.removeChild(tempDiv);
};
