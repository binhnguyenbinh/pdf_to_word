export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface GeneratedDocument {
  htmlContent: string;
  rawText: string;
}

export interface FileData {
  file: File;
  previewUrl: string;
  base64: string;
}

export type PageOrientation = 'portrait' | 'landscape';

export interface PageData {
  base64: string;
  pageIndex: number;
  orientation: PageOrientation;
  width: number;
  height: number;
  processedHtml?: string;
}
