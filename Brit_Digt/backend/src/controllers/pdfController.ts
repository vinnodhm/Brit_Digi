import { Request, Response } from 'express';
import { generatePrintPdf, CanvasPayload } from '../services/pdfService';
import { query } from '../db/connection';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/generate-pdf
export const generatePdf = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as CanvasPayload;

  if (!payload.productId || !payload.objects || !Array.isArray(payload.objects)) {
    res.status(400).json({
      success: false,
      error: 'Invalid payload. Required: productId, widthMm, heightMm, bleedMm, canvasWidthPx, canvasHeightPx, objects[]',
    });
    return;
  }

  // Fallback defaults for dimensions if not provided and productId is a real UUID
  if ((!payload.widthMm || !payload.heightMm) && UUID_RE.test(payload.productId)) {
    try {
      const productResult = await query(
        'SELECT width_mm, height_mm, bleed_mm, name FROM products WHERE id = $1',
        [payload.productId]
      );
      if (productResult.rows.length > 0) {
        const p = productResult.rows[0];
        payload.widthMm  = payload.widthMm  || parseFloat(p.width_mm);
        payload.heightMm = payload.heightMm || parseFloat(p.height_mm);
        payload.bleedMm  = payload.bleedMm  || parseFloat(p.bleed_mm);
        payload.productName = payload.productName || p.name;
      }
    } catch (dbErr) {
      console.error('Failed to fetch product dimensions:', dbErr);
    }
  }

  payload.bleedMm = payload.bleedMm ?? 3;
  payload.canvasWidthPx  = payload.canvasWidthPx  ?? 800;
  payload.canvasHeightPx = payload.canvasHeightPx ?? 500;
  payload.productName    = payload.productName ?? 'Print Product';

  try {
    const result = await generatePrintPdf(payload);

    res.json({
      success: true,
      data: {
        pdfUrl: result.pdfUrl,
        filename: result.filename,
        message: 'Print-ready PDF generated successfully with 3mm bleed and CMYK output intent.',
      },
    });
  } catch (err) {
    console.error('generatePdf error:', err);
    res.status(500).json({ success: false, error: 'PDF generation failed' });
  }
};
