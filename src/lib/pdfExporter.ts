import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Overlay, FontData } from '../store/usePDFStore';

// Simple Arabic Reverser for Basic RTL support in PDF-lib
// Note: True shaping (joining) requires a more complex library like 'arabic-shaper'
// but for this implementation we'll try to provide a clean fallback.
function shapeArabic(text: string): string {
  // Check if it's Arabic
  if (!/[\u0600-\u06FF]/.test(text)) return text;
  // Basic RTL reverse for lines
  return text.split('').reverse().join('');
}

export async function exportPDF(
  originalPdfArrayBuffer: ArrayBuffer,
  overlays: Overlay[],
  customFonts: FontData[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalPdfArrayBuffer);
  pdfDoc.registerFontkit(fontkit);

  // Load custom fonts
  const fontCache: Record<string, any> = {};
  for (const fontData of customFonts) {
    try {
      const fontBytes = await fetch(fontData.url).then(res => res.arrayBuffer());
      fontCache[fontData.name] = await pdfDoc.embedFont(fontBytes);
    } catch (e) {
      console.error('Failed to embed font:', fontData.name, e);
    }
  }

  const pages = pdfDoc.getPages();

  for (const overlay of overlays) {
    const page = pages[overlay.pageNumber - 1];
    if (!page) continue;

    const { width, height } = page.getSize();
    
    // Convert canvas coordinates to PDF coordinates
    // (0,0) in PDF is bottom-left
    const pdfX = (overlay.x / 100) * width;
    const pdfY = height - (overlay.y / 100) * height;

    let font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    if (fontCache[overlay.fontFamily]) {
      font = fontCache[overlay.fontFamily];
    } else if (overlay.language === 'bn') {
      // Fallback for Bengali if possible - usually required to embed a font correctly
      // For now, if no custom font is provided, it might show boxes
    }

    const processedText = overlay.language === 'ar' ? shapeArabic(overlay.content) : overlay.content;

    // Estimate width for alignment if we can
    const textWidth = font.widthOfTextAtSize(processedText, overlay.fontSize);
    let xOffset = 0;
    if (overlay.alignment === 'center') xOffset = -textWidth / 2;
    if (overlay.alignment === 'right') xOffset = -textWidth;

    page.drawText(processedText, {
      x: pdfX + xOffset,
      y: pdfY - (overlay.fontSize / 2), 
      size: overlay.fontSize,
      font: font,
      color: hexToRgb(overlay.color),
      opacity: overlay.opacity,
      rotate: degrees(-overlay.rotation),
    });
  }

  return await pdfDoc.save();
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
}
