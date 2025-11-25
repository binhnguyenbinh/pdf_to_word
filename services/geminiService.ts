import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { PageData } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

/**
 * Detects orientation based on content analysis
 */
export const detectOrientation = async (base64: string): Promise<'portrait' | 'landscape'> => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY không được cấu hình');
    }
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: { temperature: 0.1 },
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64
            }
          },
          {
            text: "Phân tích hình ảnh này. Nếu nội dung chính rộng hơn cao (nhiều ký tự trên một dòng, bảng rộng), trả về 'landscape'. Nếu nội dung chính cao hơn rộng, trả về 'portrait'. Chỉ trả về một từ: landscape hoặc portrait"
          }
        ]
      }
    });

    const result = response.text?.toLowerCase().trim() || 'portrait';
    return result.includes('landscape') ? 'landscape' : 'portrait';
  } catch (error) {
    console.error('Orientation detection error:', error);
    return 'portrait';
  }
};

/**
 * Sends a PDF page image to Gemini to OCR and reformat according to VN standards.
 */
export const processPage = async (pageData: PageData, totalPages: number): Promise<string> => {
  const model = "gemini-2.5-flash";
  const { pageIndex, base64 } = pageData;

  // Detect orientation from content
  const detectedOrientation = await detectOrientation(base64);
  const orientationText = detectedOrientation === 'landscape' ? 'NGANG' : 'DỌC';

  const systemInstruction = `
    Bạn là chuyên gia số hóa văn bản hành chính Việt Nam theo Nghị định 30/2020/NĐ-CP.
    
    NHIỆM VỤ: Chuyển đổi hình ảnh thành HTML với MEASUREMENTS CHÍNH XÁC.
    
    QUY TẮC HTML OUTPUT:
    1. KHÔNG dùng <html>, <head>, <body> - CHỈ trả về nội dung HTML
    2. SỬ DỤNG INLINE CSS với measurements CHÍNH XÁC
    3. Font: font-family: 'Times New Roman', serif;
    4. Font size: font-size: 14pt; (nội dung chính), 13pt (số trang, chú thích)
    5. Line height: line-height: 1.5;
    6. Text align: text-align: justify; (văn bản thường)
    7. Margins: margin-top: 6pt; margin-bottom: 6pt; (cho mỗi đoạn)
    
    CẤU TRÚC:
    - Mỗi đoạn văn: <p style="font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; text-align: justify; margin: 6pt 0;">Nội dung</p>
    - Tiêu đề: <p style="font-family: 'Times New Roman', serif; font-size: 16pt; font-weight: bold; text-align: center; margin: 12pt 0;">Tiêu đề</p>
    - Bảng: <table style="width: 100%; border-collapse: collapse; margin: 12pt 0;">
              <tr><td style="border: 1px solid black; padding: 5pt; font-family: 'Times New Roman', serif; font-size: 14pt;">Nội dung</td></tr>
            </table>
    - Căn trái: text-align: left;
    - Căn giữa: text-align: center;
    - Căn phải: text-align: right;
    - In đậm: font-weight: bold;
    - In nghiêng: font-style: italic;
    - Gạch chân: text-decoration: underline;
    
    BỎ:
    - Chữ viết tay
    - Dấu đóng công văn
    - Ghi chú lề
    
    GIỮ NGUYÊN:
    - Vị trí chính xác của text
    - Khoảng cách giữa các đoạn
    - Bảng biểu với border
    - Căn lề chính xác
    - Font size chính xác
  `;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY không được cấu hình');
    }
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
      },
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64
            }
          },
          {
            text: `Trang ${pageIndex}/${totalPages}. Orientation: ${orientationText}. 
            
Chuyển đổi sang HTML với inline CSS chính xác. 
Mỗi element phải có style inline đầy đủ: font-family, font-size, line-height, text-align, margin.
Bảng phải có border: 1px solid black và padding: 5pt.
Giữ nguyên 100% layout và vị trí.`
          }
        ]
      }
    });

    let html = response.text || "";
    
    // Clean up markdown code blocks if present
    html = html.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    
    return html.trim();
  } catch (error) {
    console.error(`Gemini API Error at page ${pageIndex}:`, error);
    throw new Error(`Lỗi xử lý trang ${pageIndex}.`);
  }
};
