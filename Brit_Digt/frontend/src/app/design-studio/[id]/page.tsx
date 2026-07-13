'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MOCK_PRODUCTS } from '@/lib/products';
import { Product, GeneratePdfPayload } from '@/types';
import { generatePdf } from '@/lib/api';

// Canvas dimensions
const PX_PER_MM = 3.5;

interface GenerateResult {
  pdfUrl: string;
  filename: string;
  message: string;
}

// Use a loose type for the Fabric canvas instance to avoid import-time SSR issues.
// We only interact with it after dynamic import on the client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

export default function DesignStudioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fabricRef    = useRef<FabricCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct]           = useState<Product | null>(null);
  const [loading, setLoading]           = useState(true);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [result, setResult]             = useState<GenerateResult | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [history, setHistory]           = useState<string[]>([]);
  const [activeColor, setActiveColor]   = useState('#1a1a2e');
  const [activeFontSize, setActiveFontSize] = useState(24);

  // ── Load product ──────────────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem('selectedProduct');
    if (stored) {
      setProduct(JSON.parse(stored) as Product);
      setLoading(false);
      return;
    }
    const mock = MOCK_PRODUCTS.find((p) => p.id === params.id);
    if (mock) setProduct(mock);
    setLoading(false);
  }, [params.id]);

  // ── Init Fabric.js (client-side only, dynamic import) ─────────────────
  useEffect(() => {
    if (!canvasRef.current || !product || typeof window === 'undefined') return;

    let isMounted = true;

    const initFabric = async () => {
      // Dynamic import avoids SSR canvas issues
      const { fabric } = await import('fabric');

      if (!isMounted || !canvasRef.current) return;

      const widthMm  = parseFloat(product.width_mm);
      const heightMm = parseFloat(product.height_mm);
      const bleedMm  = parseFloat(product.bleed_mm);
      const safeMm   = parseFloat(product.safe_zone_mm ?? '3');

      const displayW = Math.min(widthMm  * PX_PER_MM + bleedMm * PX_PER_MM * 2, 800);
      const displayH = Math.min(heightMm * PX_PER_MM + bleedMm * PX_PER_MM * 2, 500);
      const bleedPx  = bleedMm * PX_PER_MM;
      const safePx   = safeMm  * PX_PER_MM;

      const canvas = new fabric.Canvas(canvasRef.current, {
        width:           displayW,
        height:          displayH,
        backgroundColor: '#ffffff',
        selection:       true,
        preserveObjectStacking: true,
      });

      fabricRef.current = canvas;

      // ── Bleed guide (red dashed) ───────────────────────────────────
      const bleedRect = new fabric.Rect({
        left:            bleedPx,
        top:             bleedPx,
        width:           displayW - bleedPx * 2,
        height:          displayH - bleedPx * 2,
        fill:            'transparent',
        stroke:          '#FF4444',
        strokeWidth:     1.5,
        strokeDashArray: [6, 4],
        selectable:      false,
        evented:         false,
        name:            '__bleed__',
      });

      // ── Safe zone guide (green dashed) ────────────────────────────
      const safeRect = new fabric.Rect({
        left:            bleedPx + safePx,
        top:             bleedPx + safePx,
        width:           displayW - (bleedPx + safePx) * 2,
        height:          displayH - (bleedPx + safePx) * 2,
        fill:            'transparent',
        stroke:          '#22C55E',
        strokeWidth:     1,
        strokeDashArray: [4, 5],
        selectable:      false,
        evented:         false,
        name:            '__safe__',
      });

      canvas.add(bleedRect);
      canvas.add(safeRect);

      // Save undo snapshot on any modification
      const saveSnapshot = () => {
        const json = JSON.stringify(canvas.toJSON(['name']));
        setHistory((prev) => [...prev.slice(-19), json]);
      };
      canvas.on('object:modified', saveSnapshot);
      canvas.on('object:added',    saveSnapshot);

      setFabricLoaded(true);
    };

    initFabric().catch(console.error);

    return () => {
      isMounted = false;
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  // ── Add text layer ────────────────────────────────────────────────────
  const addText = useCallback(async () => {
    if (!fabricRef.current) return;
    const { fabric } = await import('fabric');
    const text = new fabric.IText('Edit this text', {
      left:       100,
      top:        100,
      fontSize:   activeFontSize,
      fontFamily: 'Arial',
      fill:       activeColor,
      editable:   true,
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    fabricRef.current.renderAll();
  }, [activeColor, activeFontSize]);

  // ── Upload image ──────────────────────────────────────────────────────
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricRef.current) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const src = evt.target?.result as string;
      if (!src) return;
      const { fabric } = await import('fabric');
      fabric.Image.fromURL(src, (img) => {
        img.scaleToWidth(200);
        fabricRef.current.add(img);
        fabricRef.current.setActiveObject(img);
        fabricRef.current.renderAll();
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  // ── Delete selected ───────────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    if (!fabricRef.current) return;
    fabricRef.current.getActiveObjects().forEach((obj: FabricCanvas) => {
      fabricRef.current.remove(obj);
    });
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
  }, []);

  // ── Undo ──────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (history.length < 2 || !fabricRef.current) return;
    const prev = history[history.length - 2];
    fabricRef.current.loadFromJSON(prev, () => {
      fabricRef.current.renderAll();
    });
    setHistory((h) => h.slice(0, -1));
  }, [history]);

  // ── Save & Generate PDF ───────────────────────────────────────────────
  const saveAndGenerate = useCallback(async () => {
    if (!fabricRef.current || !product) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const canvas = fabricRef.current;
      const fullJson = canvas.toJSON(['name', 'src']);

      // Filter out guide overlays so they don't appear in the PDF
      const filteredObjects = (fullJson.objects as Array<{ name?: string }>).filter(
        (obj) => obj.name !== '__bleed__' && obj.name !== '__safe__'
      );

      const payload: GeneratePdfPayload = {
        productId:      product.id,
        productName:    product.name,
        widthMm:        parseFloat(product.width_mm),
        heightMm:       parseFloat(product.height_mm),
        bleedMm:        parseFloat(product.bleed_mm),
        canvasWidthPx:  canvas.getWidth(),
        canvasHeightPx: canvas.getHeight(),
        objects:        filteredObjects as GeneratePdfPayload['objects'],
        background:     fullJson.background as string,
      };

      const res = await generatePdf(payload);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF generation failed');
    } finally {
      setGenerating(false);
    }
  }, [product]);

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white/60 text-xl">Product not found.</p>
        <Link href="/" className="btn-primary">← Back to Catalog</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Studio Header ──────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-brand-navy-light/60 backdrop-blur-sm px-4 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href={`/product/${product.id}`} className="text-white/40 hover:text-white transition-colors text-sm">
              ← Back
            </Link>
            <div className="w-px h-4 bg-white/20" />
            <div>
              <p className="text-white font-semibold text-sm">{product.name}</p>
              <p className="text-white/40 text-xs">
                {product.width_mm}×{product.height_mm}mm · {product.bleed_mm}mm bleed
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="hidden md:flex items-center gap-4 text-xs text-white/50">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0 border-t-2 border-dashed border-red-400" />
              Bleed Line
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0 border-t border-dashed border-green-400" />
              Safe Zone
            </div>
          </div>

          {/* Save & Generate */}
          <button
            id="save-generate-btn"
            onClick={saveAndGenerate}
            disabled={generating || !fabricLoaded}
            className="btn-primary text-sm py-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </span>
            ) : '🖨️ Save & Generate Print'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* ── Left Toolbar ─────────────────────────────────────────────── */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-white/10 bg-brand-navy/40 p-4 space-y-5">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Tools</p>
            <div className="space-y-2">
              <button id="add-text-btn" onClick={addText} disabled={!fabricLoaded}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-brand-gold/40 hover:bg-white/8 transition-all text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed">
                <span className="text-xl font-bold">T</span><span>Add Text Layer</span>
              </button>
              <button id="upload-image-btn" onClick={() => fileInputRef.current?.click()} disabled={!fabricLoaded}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-brand-gold/40 hover:bg-white/8 transition-all text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed">
                <span className="text-xl">🖼</span><span>Upload Image</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <button id="delete-selected-btn" onClick={deleteSelected} disabled={!fabricLoaded}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-red-400/40 hover:bg-red-400/5 transition-all text-sm text-white/70 disabled:opacity-40 disabled:cursor-not-allowed">
                <span className="text-xl">🗑</span><span>Delete Selected</span>
              </button>
              <button id="undo-btn" onClick={undo} disabled={!fabricLoaded || history.length < 2}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/8 transition-all text-sm text-white/70 disabled:opacity-40 disabled:cursor-not-allowed">
                <span className="text-xl">↩</span><span>Undo</span>
              </button>
            </div>
          </div>

          {/* Text properties */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Text Properties</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 block mb-1">Font Size: {activeFontSize}pt</label>
                <input type="range" min={8} max={120} value={activeFontSize}
                  onChange={(e) => setActiveFontSize(Number(e.target.value))}
                  className="w-full accent-brand-gold" />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Text Color</label>
                <input type="color" value={activeColor} onChange={(e) => setActiveColor(e.target.value)}
                  className="w-full h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Canvas info */}
          <div className="glass-card p-4 text-xs text-white/40 space-y-1">
            <p className="font-semibold text-white/60">Canvas Info</p>
            <p>Product: {product.width_mm}×{product.height_mm}mm</p>
            <p>With bleed: {parseFloat(product.width_mm) + parseFloat(product.bleed_mm) * 2}×{parseFloat(product.height_mm) + parseFloat(product.bleed_mm) * 2}mm</p>
            <p>Target: 300dpi · CMYK PDF/X</p>
          </div>
        </aside>

        {/* ── Canvas Area ──────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 bg-[#1a1a2e]/50 min-h-[500px] relative">
          {!fabricLoaded && (
            <div className="absolute flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
              <p className="text-white/40 text-sm">Loading canvas…</p>
            </div>
          )}
          <div
            className={`relative shadow-2xl transition-opacity duration-500 ${fabricLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px' }}
          >
            <canvas ref={canvasRef} />
          </div>
          <p className="mt-4 text-white/30 text-xs text-center">
            Click to select · Double-click text to edit · Drag to move
          </p>
        </main>

        {/* ── Right Output Panel ───────────────────────────────────────── */}
        <aside className="w-full lg:w-64 border-t lg:border-t-0 lg:border-l border-white/10 bg-brand-navy/40 p-4 space-y-4">
          <p className="text-white/40 text-xs uppercase tracking-widest">PDF Output</p>

          {!result && !error && !generating && (
            <div className="glass-card p-4 text-center text-white/40 text-sm">
              <div className="text-3xl mb-2">📄</div>
              <p>Click &ldquo;Save &amp; Generate Print&rdquo; to produce your print-ready PDF/X file.</p>
            </div>
          )}

          {generating && (
            <div className="glass-card p-4 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-brand-gold border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-white/60 text-sm">Generating PDF/X with 3mm bleed…</p>
            </div>
          )}

          {error && (
            <div className="glass-card p-4 bg-red-500/10 border-red-400/30 text-red-300 text-sm">
              <p className="font-semibold mb-1">⚠️ Error</p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
          )}

          {result && (
            <div className="glass-card p-4 bg-emerald-500/10 border-emerald-400/20 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-sm">PDF Ready!</span>
              </div>
              <p className="text-white/50 text-xs">{result.message}</p>
              <a href={result.pdfUrl} download={result.filename} target="_blank" rel="noreferrer"
                id="download-pdf-btn" className="btn-primary w-full text-sm py-2.5 justify-center">
                ⬇️ Download PDF
              </a>
              <button onClick={() => router.push('/checkout')} className="btn-secondary w-full text-sm py-2.5">
                → Proceed to Checkout
              </button>
            </div>
          )}

          <div className="text-xs text-white/30 space-y-1 pt-2">
            <p>💡 Keep content inside the <span className="text-green-400/70">green safe zone</span></p>
            <p>💡 Extend backgrounds to the <span className="text-red-400/70">red bleed line</span></p>
            <p>💡 Use 300dpi images for best quality</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
