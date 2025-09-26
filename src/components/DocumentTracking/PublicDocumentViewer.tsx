import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, FileText, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TrackableDocument {
  id: string;
  title: string;
  original_filename: string;
  file_url: string;
  tracking_enabled: boolean;
}

interface PublicDocumentViewerProps {
  linkId: string;
}

const PublicDocumentViewer: React.FC<PublicDocumentViewerProps> = ({ linkId }) => {
  const [document, setDocument] = useState<TrackableDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const sessionId = useRef<string>(Math.random().toString(36).substring(7));
  const visitorId = useRef<string>(
    localStorage.getItem('visitor_id') || 
    (() => {
      const id = Math.random().toString(36).substring(7);
      localStorage.setItem('visitor_id', id);
      return id;
    })()
  );

  useEffect(() => {
    fetchDocument();
  }, [linkId]);

  useEffect(() => {
    if (document) {
      // Track document open
      trackEvent('document_open', 1, {
        title: document.title,
        filename: document.original_filename
      });

      // Track page view
      trackEvent('page_view', currentPage);

      // Track time spent on page
      const startTime = Date.now();
      const interval = setInterval(() => {
        trackEvent('time_spent', currentPage, {
          duration: Date.now() - startTime
        });
      }, 30000); // Track every 30 seconds

      return () => clearInterval(interval);
    }
  }, [document, currentPage]);

  useEffect(() => {
    // Track scroll events
    const handleScroll = () => {
      trackEvent('scroll', currentPage, {
        scrollY: window.scrollY,
        scrollPercent: Math.round((window.scrollY / (window.document.documentElement.scrollHeight - window.innerHeight)) * 100)
      });
    };

    // Track click events
    const handleClick = (e: MouseEvent) => {
      trackEvent('click', currentPage, {
        x: e.clientX,
        y: e.clientY,
        target: (e.target as Element)?.tagName
      });
    };

    // Track window focus/blur
    const handleFocus = () => trackEvent('focus', currentPage);
    const handleBlur = () => trackEvent('blur', currentPage);

    let scrollTimeout: NodeJS.Timeout;
    const throttledScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 500); // Throttle scroll events
    };

    window.addEventListener('scroll', throttledScroll);
    window.document.addEventListener('click', handleClick);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      window.document.removeEventListener('click', handleClick);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearTimeout(scrollTimeout);
    };
  }, [document, currentPage]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('trackable_documents')
        .select('id, title, original_filename, file_url, tracking_enabled')
        .eq('public_link_id', linkId)
        .eq('tracking_enabled', true)
        .single();

      if (fetchError || !data) {
        setError('Documento não encontrado ou não está disponível para visualização pública');
        return;
      }

      setDocument(data);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError('Erro ao carregar documento');
    } finally {
      setLoading(false);
    }
  };

  const trackEvent = async (eventType: string, pageNumber: number, data?: any) => {
    if (!document) return;

    try {
      await supabase.functions.invoke('document-tracking', {
        body: {
          documentId: document.id,
          sessionId: sessionId.current,
          eventType,
          pageNumber,
          data,
          visitorId: visitorId.current
        }
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando documento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || 'Documento não encontrado'}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">{document.title}</h1>
              <p className="text-sm text-gray-600">{document.original_filename}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="w-full h-screen">
              <iframe
                src={document.file_url}
                className="w-full h-full border-0"
                title={document.title}
                onLoad={() => trackEvent('iframe_load', 1)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-8">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Eye className="h-4 w-4" />
            <span>Documento visualizado através do ElloSuit</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicDocumentViewer;