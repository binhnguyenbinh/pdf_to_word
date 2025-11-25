import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { PageData, PageOrientation } from '../types';

// Fix for ESM import of pdfjs-dist where exports might be on .default
const pdfjs = (pdfjsLib as any).default ?? pdfjsLib;

// Configure the worker
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const convertPdfToImages = async (file: File): Promise<PageData[]> => {
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const pages: PageData[] = [];
  const totalPages = pdf.numPages;

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    
    const viewport = page.getViewport({ scale: 2.0 });
    
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
    
    const base64Url = canvas.toDataURL('image/jpeg', 0.85);
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

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

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

function ptToTwips(pt: string): number {
  const num = parseFloat(pt);
  return Math.round(num * 20); // 1pt = 20 twips
}

function getAlignment(align: string): string {
  switch (align) {
    case 'center': return 'center';
    case 'right': return 'right';
    case 'justify': return 'both';
    default: return 'left';
  }
}

function htmlToWordXml(html: string): string {
  let xml = '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  function processElement(elem: HTMLElement): string {
    let result = '';
    const styles = parseStyle(elem.getAttribute('style') || '');
    
    if (elem.tagName === 'TABLE') {
      result += htmlTableToWordXml(elem as HTMLTableElement);
    } else if (elem.tagName === 'P') {
      const textAlign = styles['text-align'] || 'left';
      const fontSize = styles['font-size'] || '14pt';
      const fontWeight = styles['font-weight'] || 'normal';
      const fontStyle = styles['font-style'] || 'normal';
      const textDecoration = styles['text-decoration'] || 'none';
      const marginTop = styles['margin-top'] || styles['margin'] || '6pt';
      const marginBottom = styles['margin-bottom'] || styles['margin'] || '6pt';
      
      const szVal = Math.round(parseFloat(fontSize) * 2); // pt to half-points
      const spacingBefore = ptToTwips(marginTop.replace('pt', ''));
      const spacingAfter = ptToTwips(marginBottom.replace('pt', ''));
      
      let rPr = `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="${szVal}"/>`;
      if (fontWeight === 'bold') rPr += '<w:b/>';
      if (fontStyle === 'italic') rPr += '<w:i/>';
      if (textDecoration.includes('underline')) rPr += '<w:u w:val="single"/>';
      
      const text = elem.textContent || '';
      if (text.trim()) {
        result += `<w:p><w:pPr><w:jc w:val="${getAlignment(textAlign)}"/><w:spacing w:before="${spacingBefore}" w:after="${spacingAfter}" w:line="360" w:lineRule="auto"/></w:pPr><w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
      }
    } else if (elem.tagName === 'DIV') {
      elem.childNodes.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          result += processElement(child as HTMLElement);
        }
      });
    } else if (elem.tagName === 'BR') {
      result += '<w:p/>';
    }
    
    return result;
  }

  tempDiv.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      xml += processElement(node as HTMLElement);
    }
  });

  return xml;
}

function htmlTableToWordXml(table: HTMLTableElement): string {
  let xml = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="12" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="12" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="12" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="12" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="12" w:space="0" w:color="000000"/></w:tblBorders></w:tblPr>';
  
  const rows = table.querySelectorAll('tr');
  rows.forEach((row) => {
    xml += '<w:tr>';
    const cells = row.querySelectorAll('td, th');
    cells.forEach((cell) => {
      const cellElem = cell as HTMLElement;
      const styles = parseStyle(cellElem.getAttribute('style') || '');
      const fontSize = styles['font-size'] || '14pt';
      const szVal = Math.round(parseFloat(fontSize) * 2);
      
      xml += `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="12"/><w:left w:val="single" w:sz="12"/><w:bottom w:val="single" w:sz="12"/><w:right w:val="single" w:sz="12"/></w:tcBorders></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="${szVal}"/></w:rPr><w:t>${escapeXml(cell.textContent || '')}</w:t></w:r></w:p></w:tc>`;
    });
    xml += '</w:tr>';
  });
  
  xml += '</w:tbl>';
  return xml;
}

export const exportToDocx = async (pages: PageData[], fileName: string) => {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
        <w:sz w:val="28"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr>
      <w:spacing w:line="360" w:lineRule="auto"/>
    </w:pPr>
  </w:style>
</w:styles>`);

  let documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>`;

  pages.forEach((page, index) => {
    const isLandscape = page.orientation === 'landscape';
    const margins = isLandscape 
      ? { top: 1440, bottom: 1440, left: 1440, right: 1440 }
      : { top: 1440, bottom: 1440, left: 1728, right: 864 };

    if (index > 0) {
      documentXml += `<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>`;
    }

    const pageXml = htmlToWordXml(page.processedHtml || '');
    documentXml += pageXml;

    if (index === pages.length - 1) {
      documentXml += `<w:sectPr>
        <w:pgSz w:w="${isLandscape ? '15840' : '12240'}" w:h="${isLandscape ? '12240' : '15840'}" w:orient="${isLandscape ? 'landscape' : 'portrait'}"/>
        <w:pgMar w:top="${margins.top}" w:bottom="${margins.bottom}" w:left="${margins.left}" w:right="${margins.right}"/>
      </w:sectPr>`;
    }
  });

  documentXml += `
  </w:body>
</w:document>`;

  zip.file('word/document.xml', documentXml);

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName.replace(/\.[^/.]+$/, "")}_formatted.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
