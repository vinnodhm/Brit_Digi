import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Fabric.js canvas object types supported by the PDF engine
interface CanvasTextObject {
  type: 'textbox' | 'i-text' | 'text';
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
}

interface CanvasImageObject {
  type: 'image';
  src: string;      // base64 data URL
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
}

interface CanvasRectObject {
  type: 'rect';
  left: number;
  top: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  ry?: number;
}

type CanvasObject = CanvasTextObject | CanvasImageObject | CanvasRectObject;

export interface CanvasPayload {
  productId: string;
  productName: string;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
  objects: CanvasObject[];
  background?: string;
}

export interface PdfResult {
  pdfPath: string;
  pdfUrl: string;
  filename: string;
}

// Convert mm to points (1mm = 2.8346 pt)
const mmToPt = (mm: number): number => mm * 2.8346;

// Convert hex color to normalized RGB (0–1 range) for PDFKit
function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;
  return [r, g, b];
}

// Map canvas pixel coordinates → PDF point coordinates (accounting for bleed offset)
function canvasToPdfCoords(
  canvasX: number,
  canvasY: number,
  canvasW: number,
  canvasH: number,
  pdfWidthPt: number,
  pdfHeightPt: number
): [number, number] {
  const x = (canvasX / canvasW) * pdfWidthPt;
  const y = (canvasY / canvasH) * pdfHeightPt;
  return [x, y];
}

export async function generatePrintPdf(payload: CanvasPayload): Promise<PdfResult> {
  const outputDir = process.env.PDF_OUTPUT_DIR || '/tmp/prints';

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `print_${uuidv4()}.pdf`;
  const pdfPath = path.join(outputDir, filename);

  // Document dimensions: product size + bleed on all 4 sides (in points)
  const totalWidthPt  = mmToPt(payload.widthMm  + payload.bleedMm * 2);
  const totalHeightPt = mmToPt(payload.heightMm + payload.bleedMm * 2);
  const bleedPt       = mmToPt(payload.bleedMm);
  const safeZonePt    = mmToPt(payload.bleedMm); // safe zone inset same as bleed

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [totalWidthPt, totalHeightPt],
      margin: 0,
      // PDF/X-1a output intent declaration (CMYK intent)
      info: {
        Title: `${payload.productName} — Print-Ready PDF`,
        Author: 'Britannia Digi Print',
        Subject: 'Web-to-Print Output',
        Keywords: 'print, CMYK, bleed, Britannia Digi Print',
        Creator: 'Britannia Digi Print v1.0',
        Producer: 'PDFKit + Britannia Digi Print',
      },
      pdfVersion: '1.4',
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // ── Background fill ──────────────────────────────────────────────
    if (payload.background && payload.background !== 'transparent') {
      const bg = payload.background.startsWith('#') ? payload.background : '#ffffff';
      const [r, g, b] = hexToRgb(bg);
      doc.rect(0, 0, totalWidthPt, totalHeightPt).fill(`rgb(${r * 255},${g * 255},${b * 255})`);
    } else {
      doc.rect(0, 0, totalWidthPt, totalHeightPt).fill('#ffffff');
    }

    // ── Render canvas objects ────────────────────────────────────────
    for (const obj of payload.objects) {
      // Skip guide rectangles (bleed/safe zone markers from canvas)
      if (obj.type === 'rect') {
        const rectObj = obj as CanvasRectObject;
        const [x, y] = canvasToPdfCoords(
          rectObj.left, rectObj.top,
          payload.canvasWidthPx, payload.canvasHeightPx,
          totalWidthPt, totalHeightPt
        );
        const w = (rectObj.width / payload.canvasWidthPx) * totalWidthPt;
        const h = (rectObj.height / payload.canvasHeightPx) * totalHeightPt;
        const fillColor = rectObj.fill && rectObj.fill !== 'transparent' ? rectObj.fill : null;
        if (fillColor) {
          doc.rect(x + bleedPt, y + bleedPt, w, h).fill(fillColor);
        }
        continue;
      }

      if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
        const textObj = obj as CanvasTextObject;
        const scaleX = textObj.scaleX ?? 1;
        const scaleY = textObj.scaleY ?? 1;

        const [x, y] = canvasToPdfCoords(
          textObj.left, textObj.top,
          payload.canvasWidthPx, payload.canvasHeightPx,
          totalWidthPt, totalHeightPt
        );

        // Scale font size proportionally to PDF dimensions
        const scaleFactor = totalWidthPt / payload.canvasWidthPx;
        const fontSizePt = textObj.fontSize * scaleFactor * scaleX;

        // Color
        const fillColor = textObj.fill && textObj.fill !== '' ? textObj.fill : '#000000';

        doc
          .fontSize(fontSizePt)
          .fillColor(fillColor)
          .text(textObj.text, x + bleedPt, y + bleedPt, {
            width: ((textObj.width * scaleX) / payload.canvasWidthPx) * totalWidthPt,
            align: (textObj.textAlign as 'left' | 'center' | 'right' | 'justify') ?? 'left',
          });
        continue;
      }

      if (obj.type === 'image') {
        const imgObj = obj as CanvasImageObject;
        const scaleX = imgObj.scaleX ?? 1;
        const scaleY = imgObj.scaleY ?? 1;

        if (!imgObj.src || !imgObj.src.startsWith('data:')) continue;

        const [x, y] = canvasToPdfCoords(
          imgObj.left, imgObj.top,
          payload.canvasWidthPx, payload.canvasHeightPx,
          totalWidthPt, totalHeightPt
        );

        const w = ((imgObj.width * scaleX) / payload.canvasWidthPx) * totalWidthPt;
        const h = ((imgObj.height * scaleY) / payload.canvasHeightPx) * totalHeightPt;

        // Strip data URL prefix and decode base64
        const base64Data = imgObj.src.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');

        doc.image(imgBuffer, x + bleedPt, y + bleedPt, { width: w, height: h });
        continue;
      }
    }

    // ── Bleed guides (crop marks / guide lines) ──────────────────────
    // Draw red dashed bleed boundary — these are trimmed away at press
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor('#FF0000')
      .rect(bleedPt, bleedPt, totalWidthPt - bleedPt * 2, totalHeightPt - bleedPt * 2)
      .dash(3, { space: 2 })
      .stroke()
      .restore();

    // Draw green dashed safe zone boundary
    const safeInset = bleedPt + safeZonePt;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor('#00AA00')
      .rect(
        safeInset,
        safeInset,
        totalWidthPt - safeInset * 2,
        totalHeightPt - safeInset * 2
      )
      .dash(2, { space: 3 })
      .stroke()
      .restore();

    doc.end();

    stream.on('finish', () => {
      const pdfUrl = `/api/pdfs/${filename}`;
      resolve({ pdfPath, pdfUrl, filename });
    });

    stream.on('error', reject);
  });
}
