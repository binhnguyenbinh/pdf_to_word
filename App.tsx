import React, { useState } from 'react';
import { ArrowRight, FileCheck2, AlertCircle } from 'lucide-react';
import { AppStatus, FileData, PageData } from './types';
import FileUploader from './components/FileUploader';
import ResultViewer from './components/ResultViewer';
import LoadingOverlay from './components/LoadingOverlay';
import { processPage } from './services/geminiService';
import { convertPdfToImages } from './utils/fileUtils';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [processedPages, setProcessedPages] = useState<PageData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleFileSelect = (data: FileData) => {
    setFileData(data);
    setStatus(AppStatus.IDLE);
    setProcessedPages([]);
    setErrorMessage(null);
    setProgress(null);
  };

  const handleClear = () => {
    setFileData(null);
    setStatus(AppStatus.IDLE);
    setProcessedPages([]);
    setErrorMessage(null);
    setProgress(null);
  };

  const handleConvert = async () => {
    if (!fileData) return;

    setStatus(AppStatus.PROCESSING);
    setErrorMessage(null);
    setProcessedPages([]);

    try {
      // 1. Convert PDF to images (with orientation detection)
      setProgress({ current: 0, total: 0 }); 
      const rawPages = await convertPdfToImages(fileData.file);
      const totalPages = rawPages.length;
      
      if (totalPages === 0) {
        throw new Error("Không tìm thấy trang nào trong file PDF.");
      }

      const results: PageData[] = [];

      // 2. Process each page sequentially
      for (let i = 0; i < totalPages; i++) {
        setProgress({ current: i + 1, total: totalPages });
        
        const currentPage = rawPages[i];
        
        // Process with Gemini
        const html = await processPage(currentPage, totalPages);
        
        // Store result
        results.push({
          ...currentPage,
          processedHtml: html
        });
      }

      setProcessedPages(results);
      setStatus(AppStatus.SUCCESS);
    } catch (error: any) {
      console.error(error);
      setStatus(AppStatus.ERROR);
      setErrorMessage(error.message || "Đã xảy ra lỗi khi xử lý tài liệu.");
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">DocFormat VN</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Chuyển đổi văn bản hành chính (Nghị định 30/2020/NĐ-CP)</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Powered by Gemini 2.5
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)] min-h-[600px]">
          
          {/* Left Column: Input */}
          <div className="flex flex-col space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full relative">
               <h2 className="text-lg font-semibold text-gray-800 mb-4">1. Tải tài liệu lên</h2>
               
               <FileUploader 
                 onFileSelect={handleFileSelect} 
                 onClear={handleClear} 
                 currentFile={fileData} 
                 disabled={status === AppStatus.PROCESSING}
               />

               {fileData && (
                 <div className="flex-1 mt-4 relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex flex-col">
                   <div className="absolute top-2 right-2 z-10 bg-black/50 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
                      Bản gốc PDF
                   </div>
                   <iframe 
                     src={fileData.previewUrl} 
                     className="w-full h-full"
                     title="PDF Preview"
                   />
                 </div>
               )}

               <div className="mt-4 pt-4 border-t border-gray-100">
                 <button
                    onClick={handleConvert}
                    disabled={!fileData || status === AppStatus.PROCESSING}
                    className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold text-white transition-all
                      ${!fileData || status === AppStatus.PROCESSING 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-primary hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-[0.98]'}`}
                 >
                    <span>{status === AppStatus.PROCESSING ? 'Đang phân tích...' : 'Bắt đầu chuyển đổi'}</span>
                    {status !== AppStatus.PROCESSING && <ArrowRight className="w-5 h-5" />}
                 </button>
               </div>
               
               {/* Error Message */}
               {status === AppStatus.ERROR && errorMessage && (
                 <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start space-x-3 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                 </div>
               )}
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="flex flex-col h-full relative">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col relative overflow-hidden">
              
              {status === AppStatus.PROCESSING && (
                <LoadingOverlay 
                  message={progress 
                    ? `Đang xử lý trang ${progress.current} / ${progress.total}` 
                    : "Đang phân tích và chia nhỏ tài liệu..."} 
                />
              )}
              
              {status === AppStatus.SUCCESS && processedPages.length > 0 ? (
                <ResultViewer pages={processedPages} originalFileName={fileData?.file.name || 'document'} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FileCheck2 className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium">Kết quả văn bản sẽ hiển thị tại đây</p>
                  <p className="text-xs mt-1">Hệ thống tự động phát hiện khổ giấy ngang/dọc</p>
                </div>
              )}

            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;
