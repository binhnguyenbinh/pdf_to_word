import React, { useRef, useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { exportToWord } from '../utils/fileUtils';
import { PageData } from '../types';

interface ResultViewerProps {
  pages: PageData[];
  originalFileName: string;
}

const ResultViewer: React.FC<ResultViewerProps> = ({ pages, originalFileName }) => {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (containerRef.current) {
        navigator.clipboard.writeText(containerRef.current.innerText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    exportToWord(pages, originalFileName);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 flex-shrink-0">
        <div>
            <h2 className="text-lg font-semibold text-gray-800">Kết quả chuẩn hóa</h2>
            <p className="text-xs text-gray-500">{pages.length} trang đã xử lý</p>
        </div>
        <div className="flex space-x-2">
            <button 
                onClick={handleCopy}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
                {copied ? <Check className="w-3 h-3 mr-1.5 text-green-600" /> : <Copy className="w-3 h-3 mr-1.5" />}
                {copied ? 'Đã chép' : 'Sao chép Text'}
            </button>
            <button 
                onClick={handleDownload}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
                <Download className="w-3 h-3 mr-1.5" />
                Tải về (.doc)
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-100 p-4 rounded-lg border border-gray-200" ref={containerRef}>
        <div className="flex flex-col items-center space-y-8 pb-8">
            {pages.map((page, index) => (
                <div key={index} className="relative group">
                    {/* Page Number Label outside paper */}
                    <div className="absolute -left-10 top-0 text-xs text-gray-400 font-mono">
                        #{page.pageIndex}
                    </div>

                    {/* Paper Simulation */}
                    <div 
                        className={`bg-white shadow-lg transition-all duration-300 ease-in-out
                            ${page.orientation === 'landscape' ? 'landscape-paper' : 'portrait-paper'}
                        `}
                        style={{
                            // Using standard A4 mm dimensions
                            width: page.orientation === 'landscape' ? '297mm' : '210mm',
                            minHeight: page.orientation === 'landscape' ? '210mm' : '297mm',
                            padding: page.orientation === 'landscape' 
                                ? '20mm 20mm 20mm 20mm' // Landscape margins
                                : '20mm 15mm 20mm 30mm', // Portrait margins (Left 30mm standard)
                            fontFamily: '"Times New Roman", serif',
                            fontSize: '14pt',
                            lineHeight: '1.5',
                            color: 'black',
                            boxSizing: 'border-box'
                        }}
                    >
                        {/* Render HTML content for this page */}
                        <div dangerouslySetInnerHTML={{ __html: page.processedHtml || '' }} />
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      <style>{`
        /* Custom print styles just in case user prints directly from browser */
        @media print {
            body * { visibility: hidden; }
            #root, #root * { visibility: visible; }
            .bg-gray-100 { background: white !important; }
            .shadow-lg { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ResultViewer;
