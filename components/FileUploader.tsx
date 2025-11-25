import React, { useCallback } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import { FileData } from '../types';
import { fileToBase64 } from '../utils/fileUtils';

interface FileUploaderProps {
  onFileSelect: (data: FileData) => void;
  onClear: () => void;
  currentFile: FileData | null;
  disabled: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, onClear, currentFile, disabled }) => {
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      onFileSelect({ file, base64, previewUrl });
    } else {
        alert("Vui lòng chỉ chọn file PDF");
    }
  }, [disabled, onFileSelect]);

  const handleInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      onFileSelect({ file, base64, previewUrl });
    }
  }, [disabled, onFileSelect]);

  if (currentFile) {
    return (
      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-4 overflow-hidden">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">{currentFile.file.name}</p>
                <p className="text-xs text-gray-500">{(currentFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
        </div>
        {!disabled && (
            <button 
                onClick={onClear}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-500"
            >
                <X className="w-5 h-5" />
            </button>
        )}
      </div>
    );
  }

  return (
    <div 
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 
        ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200' : 'border-gray-300 hover:border-primary hover:bg-blue-50 cursor-pointer'}`}
    >
      <input 
        type="file" 
        accept="application/pdf"
        onChange={handleInputChange}
        className="hidden"
        id="file-upload"
        disabled={disabled}
      />
      <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
        <div className="w-12 h-12 bg-blue-100 text-primary rounded-full flex items-center justify-center mb-4">
          <UploadCloud className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Nhấn để tải lên hoặc kéo thả vào đây</h3>
        <p className="text-xs text-gray-500 mt-2">Chỉ hỗ trợ định dạng PDF (Tối đa 20MB)</p>
      </label>
    </div>
  );
};

export default FileUploader;