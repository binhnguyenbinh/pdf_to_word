import React, { useRef, useState, useEffect } from 'react';
import { Download, Copy, Check, ZoomIn, ZoomOut, Maximize2, FileText } from 'lucide-react';
import { exportToDocx } from '../utils/fileUtils';
import { initGoogleAPI, signInGoogle, createGoogleDoc, copyForGoogleDocs } from '../services/googleDocsService';
import { PageData } from '../types';

interface ResultViewerProps {
  pages: PageData[];
  originalFileName: string;
}

const ResultViewer: React.FC<ResultViewerProps> = ({ pages, originalFileName }) => {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(60);
  const [googleSignedIn, setGoogleSignedIn] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    handleFitToScreen();
    // Initialize Google API
    initGoogleAPI().catch(console.error);
  }, []);

  const handleCopy = () => {
    if (containerRef.current) {
        navigator.clipboard.writeText(containerRef.current.innerText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyForGoogleDocs = () => {
    copyForGoogleDocs(pages);
  };

  const handleGoogleDocsCreate = async () => {
    setExporting(true);
    try {
      if (!googleSignedIn) {
        await signInGoogle();
        setGoogleSignedIn(true);
      }
      
      const docUrl = await createGoogleDoc(pages, originalFileName);
      window.open(docUrl, '_blank');
    } catch (error) {
      console.error('Error creating Google Doc:', error);
      alert('Lỗi khi tạo Google Docs. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadDocx = async () => {
    setExporting(true);
    try {
      await exportToDocx(pages, originalFileName);
    } catch (error) {
      console.error('Error exporting to DOCX:', error);
      alert('Lỗi khi xuất file DOCX');
    } finally {
      setExporting(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 40));
  };

  const handleFitToScreen = () => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth - 32;
      const pageWidth = pages[0]?.orientation === 'landscape' ? 297 : 210;
      const newZoom = Math.floor((containerWidth / (pageWidth * 3.78)) * 100);
      setZoom(Math.max(newZoom - 10, 50));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 flex-shrink-0 flex-wrap gap-2">
        <div>
            <h2 className="text-lg font-semibold text-gray-800">Kết quả chuẩn hóa</h2>
            <p className="text-xs text-gray-500">{pages.length} trang đã xử lý</p>
        </div>
        <div className="flex space-x-2 flex-wrap items-center">
            <button 
                onClick={handleCopy}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
                {copied ? <Check className="w-3 h-3 mr-1.5 text-green-600" /> : <Copy className="w-3 h-3 mr-1.5" />}
                {copied ? 'Đã chép' : 'Sao chép'}
            </button>
            
            <button 
                onClick={handleCopyForGoogleDocs}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
                <FileText className="w-3 h-3 mr-1.5" />
                Copy → Docs
            </button>

            <button 
                onClick={handleGoogleDocsCreate}
                disabled={exporting}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
            >
                <svg className="w-3 h-3 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                {exporting ? 'Đang...' : 'Tạo Google Docs'}
            </button>

            <button 
                onClick={handleDownloadDocx}
                disabled={exporting}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
                <Download className="w-3 h-3 mr-1.5" />
                {exporting ? 'Đang...' : 'Tải DOCX'}
            </button>
            
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 border-l border-gray-300 pl-2 ml-2">
              <button 
                  onClick={handleZoomOut}
                  className="flex items-center px-2 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                  <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-xs font-medium text-gray-600 w-10 text-center">{zoom}%</span>
              <button 
                  onClick={handleZoomIn}
                  className="flex items-center px-2 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                  <ZoomIn className="w-3 h-3" />
              </button>
              <button 
                  onClick={handleFitToScreen}
                  className="flex items-center px-2 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                  <Maximize2 className="w-3 h-3" />
              </button>
            </div>
        </div>
      </div>

      {/* Content Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-auto bg-gray-100 p-4 rounded-lg border border-gray-200"
      >
        <div 
          ref={containerRef}
          className="flex flex-col items-center space-y-4 pb-8"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s ease-out' }}
        >
            {pages.map((page, index) => (
                <div key={index} className="relative">
                    {/* Paper Simulation */}
                    <div 
                        className="bg-white shadow-md"
                        style={{
                            width: page.orientation === 'landscape' ? '297mm' : '210mm',
                            minHeight: page.orientation === 'landscape' ? '210mm' : '297mm',
                            padding: page.orientation === 'landscape' 
                                ? '20mm 20mm 20mm 20mm'
                                : '20mm 15mm 20mm 30mm',
                            fontFamily: '"Times New Roman", serif',
                            fontSize: '14pt',
                            lineHeight: '1.5',
                            color: 'black',
                            boxSizing: 'border-box',
                            border: '1px solid #ddd'
                        }}
                    >
                        <div dangerouslySetInnerHTML={{ __html: page.processedHtml || '' }} />
                    </div>
                    <div className="text-center text-xs text-gray-400 mt-1">Trang {page.pageIndex}</div>
                </div>
            ))}
        </div>
      </div>
      
      <style>{`
        @media print {
            body * { visibility: hidden; }
            #root, #root * { visibility: visible; }
            .bg-gray-100 { background: white !important; }
            .shadow-md { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ResultViewer;
