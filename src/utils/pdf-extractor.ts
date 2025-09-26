import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '@/integrations/supabase/client';

// Configure worker for browser usage via CDN to avoid bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js`;

export async function extractAndUploadPdfPages(fileUrl: string, documentId: string, options?: { maxWidth?: number; format?: 'image/webp' | 'image/png'; quality?: number; }) {
  const maxWidth = options?.maxWidth ?? 1400;
  const format = options?.format ?? 'image/webp';
  const quality = options?.quality ?? 0.9;

  // Load PDF from URL
  const response = await fetch(fileUrl, { mode: 'cors' });
  if (!response.ok) throw new Error('Falha ao baixar PDF para extração');
  const arrayBuffer = await response.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let uploaded = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });

    // Compute scale to fit maxWidth
    const scale = Math.min(maxWidth / viewport.width, 2); // cap scale to avoid huge canvases
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context não disponível');

    canvas.width = Math.floor(scaledViewport.width);
    canvas.height = Math.floor(scaledViewport.height);

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

    // Convert to blob
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao converter página em imagem'))), format, quality);
    });

    // Upload to storage under pages/{documentId}/page-{i}.webp/png
    const ext = format === 'image/png' ? 'png' : 'webp';
    const path = `pages/${documentId}/page-${String(i).padStart(4, '0')}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('trackable-documents')
      .upload(path, blob, { upsert: true, cacheControl: '3600' });

    if (uploadError) throw new Error(`Erro ao enviar página ${i}: ${uploadError.message}`);

    uploaded++;
  }

  return uploaded;
}

export async function listExtractedPageUrls(documentId: string) {
  const { data, error } = await supabase.storage
    .from('trackable-documents')
    .list(`pages/${documentId}`, { limit: 500, sortBy: { column: 'name', order: 'asc' } });

  if (error) return [] as string[];
  if (!data || data.length === 0) return [] as string[];

  return data
    .filter((f) => f.name.endsWith('.webp') || f.name.endsWith('.png') || f.name.endsWith('.jpg'))
    .map((f) => supabase.storage.from('trackable-documents').getPublicUrl(`pages/${documentId}/${f.name}`).data.publicUrl);
}
