import { Router } from 'express';
import { listProducts, getProduct } from '../controllers/productController';
import { createOrder, getOrder, updateOrderStatus } from '../controllers/orderController';
import { generatePdf } from '../controllers/pdfController';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

const router = Router();

// ── Health check ──────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Britannia Digi Print API', timestamp: new Date().toISOString() });
});

// ── Products ──────────────────────────────────────────────────────────
router.get('/products',     listProducts);
router.get('/products/:id', getProduct);

// ── Orders ────────────────────────────────────────────────────────────
router.post('/orders',              createOrder);
router.get('/orders/:id',           getOrder);
router.patch('/orders/:id/status',  updateOrderStatus);

// ── PDF generation ────────────────────────────────────────────────────
router.post('/generate-pdf', generatePdf);

// ── PDF file serving ──────────────────────────────────────────────────
router.get('/pdfs/:filename', (req: Request, res: Response) => {
  const outputDir = process.env.PDF_OUTPUT_DIR || '/tmp/prints';
  const filename  = path.basename(req.params.filename); // prevent path traversal
  const filePath  = path.join(outputDir, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, error: 'PDF not found' });
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  fs.createReadStream(filePath).pipe(res);
});

export default router;
