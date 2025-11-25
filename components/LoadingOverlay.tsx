import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "Đang xử lý..." }) => {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-xl">
      <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
      <p className="text-sm font-medium text-primary animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingOverlay;