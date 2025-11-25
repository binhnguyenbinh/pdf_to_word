import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { PageData } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Sends a PDF page image to Gemini to OCR and reformat according to VN standards.
 */
export const processPage = async (pageData: PageData, totalPages: number): Promise<string> => {
  const model = "gemini-2.5-flash";
  const { pageIndex, orientation, base64 } = pageData;

  const orientationText = orientation === 'landscape' ? 'KHỔ GIẤY NGANG (LANDSCAPE)' : 'KHỔ GIẤY DỌC (PORTRAIT)';

  // Detailed prompts for Decree 30/2020/ND-CP
  const systemInstruction = `
    Bạn là chuyên gia soạn thảo và số hóa văn bản hành chính Việt Nam (theo Nghị định 30/2020/NĐ-CP).
    
    NHIỆM VỤ: 
    Chuyển đổi hình ảnh văn bản ${orientationText} thành mã HTML.
    
    NGUYÊN TẮC CỐT LÕI:
    1. TRUNG THỰC TUYỆT ĐỐI VỚI BỐ CỤC GỐC: 
       - Nếu văn bản có bảng biểu (Table), HÃY TẠO HTML TABLE tương ứng. Đừng chuyển thành văn bản thường.
       - Giữ nguyên số cột, số dòng.
       - Nếu văn bản chia cột (ví dụ phần Nơi nhận), hãy dùng Table ẩn viền (border: none) để chia cột.
    
    2. ĐỊNH DẠNG THEO NGHỊ ĐỊNH 30:
       - Font: Times New Roman.
       - Căn lề: Justify cho văn bản thường.
       - Line-height: 1.5.
    
    3. XỬ LÝ SỐ TRANG:
       - Nếu thấy số trang trên hình ảnh, hãy đặt nó vào một thẻ <div> riêng ở vị trí tương ứng (thường là đầu trang hoặc giữa cuối trang).
       - Style cho số trang: font-size: 13px; text-align: center; margin-top: 10px; margin-bottom: 10px;
    
    YÊU CẦU KỸ THUẬT HTML:
    - KHÔNG dùng thẻ <html>, <head>, <body>. Chỉ trả về nội dung bên trong body.
    - Dùng Inline CSS.
    - Đối với bảng biểu (Table): width="100%", border-collapse="collapse".
    - Đối với Quốc hiệu/Tiêu ngữ (nếu trang 1): Dùng Table 2 cột, border: none. Cột trái: Cơ quan chủ quản (in hoa), Cơ quan ban hành (in hoa đậm). Cột phải: Quốc hiệu (in hoa đậm), Tiêu ngữ (in thường đậm, gạch chân).
    - KHÔNG thêm bất kỳ lời dẫn nào ngoài HTML.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // Low temperature for higher fidelity
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
            text: `Đây là trang ${pageIndex} trên tổng số ${totalPages} trang. Chiều trang: ${orientationText}. Hãy chuyển đổi sang HTML giữ nguyên bố cục bảng biểu và nội dung.`
          }
        ]
      }
    });

    return response.text || "";
  } catch (error) {
    console.error(`Gemini API Error at page ${pageIndex}:`, error);
    throw new Error(`Lỗi xử lý trang ${pageIndex}.`);
  }
};
