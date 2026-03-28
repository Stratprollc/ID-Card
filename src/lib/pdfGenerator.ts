import { jsPDF } from 'jspdf';
import { CardSet, PrintSettings } from '../types';

const CARD_WIDTH_IN = 3.375;
const CARD_HEIGHT_IN = 2.125;

const PAGE_DIMENSIONS = {
  A4: { width: 8.27, height: 11.69 },
  Legal: { width: 8.5, height: 14 },
};

const getImageDimensions = (base64: string): Promise<{ width: number, height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = base64;
  });
};

const processImageForPhotocopy = (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      // Create rounded clipping path
      const radius = Math.min(img.width, img.height) * 0.04; // Subtle rounding
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(img.width - radius, 0);
      ctx.quadraticCurveTo(img.width, 0, img.width, radius);
      ctx.lineTo(img.width, img.height - radius);
      ctx.quadraticCurveTo(img.width, img.height, img.width - radius, img.height);
      ctx.lineTo(radius, img.height);
      ctx.quadraticCurveTo(0, img.height, 0, img.height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.clip();

      // Apply Grayscale and subtle Contrast for a clear, natural Photocopy look
      ctx.filter = 'grayscale(100%) contrast(1.1) brightness(1.0)';
      ctx.drawImage(img, 0, 0);
      
      // SHARPENING KERNEL: To clear up blurry images
      // We process pixels to enhance edges
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const output = ctx.createImageData(width, height);
      const outputData = output.data;

      // 3x3 Sharpening Kernel:
      // [ 0, -1,  0 ]
      // [-1,  5, -1 ]
      // [ 0, -1,  0 ]
      const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ];

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          for (let c = 0; c < 3; c++) { // R, G, B
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const pixelIdx = ((y + ky) * width + (x + kx)) * 4 + c;
                const kernelIdx = (ky + 1) * 3 + (kx + 1);
                sum += pixels[pixelIdx] * kernel[kernelIdx];
              }
            }
            const idx = (y * width + x) * 4 + c;
            outputData[idx] = Math.min(255, Math.max(0, sum));
          }
          outputData[(y * width + x) * 4 + 3] = 255; // Alpha
        }
      }
      ctx.putImageData(output, 0, 0);
      
      resolve(canvas.toDataURL('image/jpeg', 1.0));
    };
    img.src = base64;
  });
};

export const generatePDF = async (sets: CardSet[], settings: PrintSettings) => {
  const { pageSize, layoutMode, content, preset, showCutLines } = settings;
  const portraitDim = PAGE_DIMENSIONS[pageSize];
  
  // Use landscape orientation
  const pageW = portraitDim.height;
  const pageH = portraitDim.width;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: [pageW, pageH],
  });

  const drawCard = async (imgData: string, x: number, y: number) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, CARD_WIDTH_IN, CARD_HEIGHT_IN, 'F');
    
    try {
      // Process image for photocopy look (B&W + Rounded)
      const processedImg = await processImageForPhotocopy(imgData);
      const dims = await getImageDimensions(processedImg);
      const cardAspect = CARD_WIDTH_IN / CARD_HEIGHT_IN;
      const imgAspect = dims.width / dims.height;
      
      let drawW = CARD_WIDTH_IN;
      let drawH = CARD_HEIGHT_IN;
      let drawX = x;
      let drawY = y;
      
      if (imgAspect > cardAspect) {
        drawH = CARD_WIDTH_IN / imgAspect;
        drawY = y + (CARD_HEIGHT_IN - drawH) / 2;
      } else {
        drawW = CARD_HEIGHT_IN * imgAspect;
        drawX = x + (CARD_WIDTH_IN - drawW) / 2;
      }
      
      doc.addImage(processedImg, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');
    } catch (e) {
      doc.addImage(imgData, 'JPEG', x, y, CARD_WIDTH_IN, CARD_HEIGHT_IN, undefined, 'FAST');
    }
    
    if (showCutLines) {
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.005);
      doc.rect(x, y, CARD_WIDTH_IN, CARD_HEIGHT_IN, 'S');
    }
  };

  const halfPageW = pageW / 2;
  const spacingY = 0.5; // Increased spacing for natural look
  const totalHeight = (CARD_HEIGHT_IN * 2) + spacingY;
  const marginY = (pageH - totalHeight) / 2; // Perfectly centered vertically

  if (layoutMode === 'single') {
    const set = sets[0];
    const centerX = halfPageW / 2; // Center of the left half
    
    if (set.frontImage) await drawCard(set.frontImage, centerX - CARD_WIDTH_IN / 2, marginY);
    if (set.backImage) await drawCard(set.backImage, centerX - CARD_WIDTH_IN / 2, marginY + CARD_HEIGHT_IN + spacingY);
  } else {
    // Double mode: Set 1 in left half, Set 2 in right half
    const set1 = sets[0];
    const set2 = sets[1];

    // Left Half (Set 1)
    const centerX1 = halfPageW / 2;
    if (set1.frontImage) await drawCard(set1.frontImage, centerX1 - CARD_WIDTH_IN / 2, marginY);
    if (set1.backImage) await drawCard(set1.backImage, centerX1 - CARD_WIDTH_IN / 2, marginY + CARD_HEIGHT_IN + spacingY);

    // Right Half (Set 2)
    const centerX2 = halfPageW + (halfPageW / 2);
    if (set2?.frontImage) await drawCard(set2.frontImage, centerX2 - CARD_WIDTH_IN / 2, marginY);
    if (set2?.backImage) await drawCard(set2.backImage, centerX2 - CARD_WIDTH_IN / 2, marginY + CARD_HEIGHT_IN + spacingY);
  }

  if (showCutLines) {
    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([0.1, 0.1], 0);
    // Vertical cut line in the middle
    doc.line(pageW / 2, 0, pageW / 2, pageH);
    doc.setLineDashPattern([], 0);
  }

  doc.save(`${sets[0].title || 'card-print'}.pdf`);
};
