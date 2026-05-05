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

const processImageForPhotocopy = (
  base64: string, 
  colorMode: 'bw' | 'color',
  contrastLevel: number,
  sharpenLevel: number,
  brightnessLevel: number,
  saturationLevel: number,
  gammaLevel: number
): Promise<string> => {
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

      // Fill with white first to avoid black backgrounds on transparent PNGs
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set high-quality image smoothing for better clarity
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Apply enhancement filters for clarity and sharpness
      const contrast = colorMode === 'bw' ? contrastLevel : contrastLevel * 0.9;
      const brightness = brightnessLevel;
      const saturation = colorMode === 'bw' ? 0 : saturationLevel;
      
      ctx.filter = `${colorMode === 'bw' ? 'grayscale(100%) ' : ''}contrast(${contrast}) brightness(${brightness}) saturate(${saturation})`;
      
      ctx.drawImage(img, 0, 0);

      // Apply sharpening and Gamma correction
      if (img.width * img.height < 4000000) { // Limit to ~4MP images
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const originalData = new Uint8ClampedArray(data);
        
        // Sharpening Kernel: [0, -s, 0, -s, 1+4s, -s, 0, -s, 0] where s is sharpenLevel
        const s = sharpenLevel;
        const kernel = [0, -s, 0, -s, 1 + 4 * s, -s, 0, -s, 0];
        const w = canvas.width;
        const h = canvas.height;

        // Precompute gamma table for performance
        const gammaTable = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
          gammaTable[i] = Math.pow(i / 255, 1 / gammaLevel) * 255;
        }

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            
            // Apply sharpening (only for pixels not on the edge)
            if (s > 0 && x > 0 && x < w - 1 && y > 0 && y < h - 1) {
              for (let c = 0; c < 3; c++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                  for (let kx = -1; kx <= 1; kx++) {
                    sum += originalData[((y + ky) * w + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
                  }
                }
                data[idx + c] = Math.min(255, Math.max(0, sum));
              }
            }

            // Apply Gamma correction to all pixels
            if (gammaLevel !== 1.0) {
              data[idx] = gammaTable[data[idx]];     // R
              data[idx + 1] = gammaTable[data[idx + 1]]; // G
              data[idx + 2] = gammaTable[data[idx + 2]]; // B
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
      
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = base64;
  });
};

export const generatePDF = async (sets: CardSet[], settings: PrintSettings) => {
  const { 
    pageSize, layoutMode, content, preset, fitMode, colorMode, 
    contrastLevel, sharpenLevel, brightnessLevel, saturationLevel, gammaLevel 
  } = settings;
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
    try {
      // Process image for photocopy look (B&W) or keep color
      const processedImg = await processImageForPhotocopy(
        imgData, 
        colorMode, 
        contrastLevel, 
        sharpenLevel,
        brightnessLevel,
        saturationLevel,
        gammaLevel
      );
      const dims = await getImageDimensions(processedImg);
      const cardAspect = CARD_WIDTH_IN / CARD_HEIGHT_IN;
      const imgAspect = dims.width / dims.height;
      
      let drawW = CARD_WIDTH_IN;
      let drawH = CARD_HEIGHT_IN;
      let drawX = x;
      let drawY = y;
      
      // Always use 'contain' logic to avoid cropping, unless user explicitly wants fill
      if (fitMode === 'contain') {
        if (imgAspect > cardAspect) {
          drawH = CARD_WIDTH_IN / imgAspect;
          drawY = y + (CARD_HEIGHT_IN - drawH) / 2;
        } else {
          drawW = CARD_HEIGHT_IN * imgAspect;
          drawX = x + (CARD_WIDTH_IN - drawW) / 2;
        }
      }
      
      // Add a very subtle shadow behind the card (extremely light gray)
      doc.setFillColor(250, 250, 250);
      doc.rect(drawX + 0.005, drawY + 0.005, drawW, drawH, 'F');
      
      doc.addImage(processedImg, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');
    } catch (e) {
      doc.addImage(imgData, 'JPEG', x, y, CARD_WIDTH_IN, CARD_HEIGHT_IN, undefined, 'FAST');
    }
  };

  const halfPageW = pageW / 2;
  const spacingY = 0.5; // Increased spacing for natural look
  const totalHeight = (CARD_HEIGHT_IN * 2) + spacingY;
  const marginY = (pageH - totalHeight) / 2; // Perfectly centered vertically

  // Process sets in chunks based on layout mode
  const chunkSize = layoutMode === 'single' ? 1 : 2;
  for (let i = 0; i < sets.length; i += chunkSize) {
    if (i > 0) {
      doc.addPage([pageW, pageH], 'landscape');
    }

    const currentSets = sets.slice(i, i + chunkSize);

    if (layoutMode === 'single') {
      const set = currentSets[0];
      const rightMargin = 0.9; 
      const rightX = pageW - CARD_WIDTH_IN - rightMargin; // Position on the right side with 0.9" margin
      
      if (set.frontImage) await drawCard(set.frontImage, rightX, marginY);
      if (set.backImage) await drawCard(set.backImage, rightX, marginY + CARD_HEIGHT_IN + spacingY);

      // Draw horizontal guides for single set
      const midY = marginY + CARD_HEIGHT_IN + (spacingY / 2);
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([0.1, 0.1], 0);
      doc.setLineWidth(0.005);
      doc.line(rightX - 0.2, midY, rightX - 0.05, midY);
      doc.line(rightX + CARD_WIDTH_IN + 0.05, midY, rightX + CARD_WIDTH_IN + 0.2, midY);
    } else {
      // Double mode: Set 1 in left half, Set 2 in right half
      const set1 = currentSets[0];
      const set2 = currentSets[1];

      // Left Half (Set 1)
      const centerX1 = halfPageW / 2;
      if (set1.frontImage) await drawCard(set1.frontImage, centerX1 - CARD_WIDTH_IN / 2, marginY);
      if (set1.backImage) await drawCard(set1.backImage, centerX1 - CARD_WIDTH_IN / 2, marginY + CARD_HEIGHT_IN + spacingY);

      // Right Half (Set 2)
      if (set2) {
        const centerX2 = halfPageW + (halfPageW / 2);
        if (set2.frontImage) await drawCard(set2.frontImage, centerX2 - CARD_WIDTH_IN / 2, marginY);
        if (set2.backImage) await drawCard(set2.backImage, centerX2 - CARD_WIDTH_IN / 2, marginY + CARD_HEIGHT_IN + spacingY);
      }

      // Draw Vertical Center Cutting Guide
      doc.setDrawColor(220, 220, 220);
      doc.setLineDashPattern([0.1, 0.1], 0);
      doc.setLineWidth(0.005);
      doc.line(halfPageW, 0.2, halfPageW, pageH - 0.2);

      // Draw Horizontal Cutting Guides
      const midY = marginY + CARD_HEIGHT_IN + (spacingY / 2);
      doc.setDrawColor(200, 200, 200);
      
      // Marks for left set
      const x1 = (halfPageW / 2) - (CARD_WIDTH_IN / 2);
      doc.line(x1 - 0.2, midY, x1 - 0.05, midY);
      doc.line(x1 + CARD_WIDTH_IN + 0.05, midY, x1 + CARD_WIDTH_IN + 0.2, midY);
      
      if (set2) {
        // Marks for right set
        const x2 = (halfPageW + halfPageW / 2) - (CARD_WIDTH_IN / 2);
        doc.line(x2 - 0.2, midY, x2 - 0.05, midY);
        doc.line(x2 + CARD_WIDTH_IN + 0.05, midY, x2 + CARD_WIDTH_IN + 0.2, midY);
      }
    }
  }

  doc.save(`${sets[0].title || 'card-print'}.pdf`);
};
