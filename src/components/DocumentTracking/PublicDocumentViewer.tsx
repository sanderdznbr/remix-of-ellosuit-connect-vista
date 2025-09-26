import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle } from 'lucide-react';
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
  const [trackableDoc, setTrackableDoc] = useState<TrackableDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageStartTime, setPageStartTime] = useState<Record<number, number>>({});
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
    if (trackableDoc) {
      // Track document open
      trackEvent('document_open', 1, {
        title: trackableDoc.title,
        filename: trackableDoc.original_filename
      });

      // Set start time for current page
      const now = Date.now();
      setPageStartTime(prev => ({ ...prev, [currentPage]: now }));

      // Track page view
      trackEvent('page_view', currentPage);

      // Track time spent on page every 30 seconds
      const timeInterval = setInterval(() => {
        const startTime = pageStartTime[currentPage];
        if (startTime) {
          const duration = Date.now() - startTime;
          trackEvent('time_spent', currentPage, { duration });
        }
      }, 30000);

      // Track when user leaves the page/document
      const handleBeforeUnload = () => {
        const startTime = pageStartTime[currentPage];
        if (startTime) {
          const duration = Date.now() - startTime;
          trackEvent('session_end', currentPage, { 
            totalDuration: duration,
            finalPage: currentPage 
          });
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        clearInterval(timeInterval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        // Track final time on page when component unmounts
        const startTime = pageStartTime[currentPage];
        if (startTime) {
          const duration = Date.now() - startTime;
          trackEvent('time_spent', currentPage, { duration });
        }
      };
    }
  }, [trackableDoc, currentPage]);

  useEffect(() => {
    // Track scroll events (throttled)
    const handleScroll = () => {
      const scrollPercent = Math.round((window.scrollY / (window.document.documentElement.scrollHeight - window.innerHeight)) * 100);
      trackEvent('scroll', currentPage, {
        scrollY: window.scrollY,
        scrollPercent: Math.min(100, Math.max(0, scrollPercent))
      });
    };

    // Track click events with more details
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      trackEvent('click', currentPage, {
        x: e.clientX,
        y: e.clientY,
        target: target?.tagName,
        className: target?.className,
        pageX: e.pageX,
        pageY: e.pageY
      });
    };

    // Track window focus/blur for engagement
    const handleVisibilityChange = () => {
      if (window.document.hidden) {
        trackEvent('page_blur', currentPage, {
          timestamp: Date.now()
        });
      } else {
        trackEvent('page_focus', currentPage, {
          timestamp: Date.now()
        });
      }
    };

    // Track mouse movement heatmap (sampled)
    let mouseMoveCounter = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseMoveCounter++;
      // Only track every 50th mouse movement to avoid spam
      if (mouseMoveCounter % 50 === 0) {
        trackEvent('mouse_move', currentPage, {
          x: e.clientX,
          y: e.clientY,
          pageX: e.pageX,
          pageY: e.pageY
        });
      }
    };

    let scrollTimeout: NodeJS.Timeout;
    const throttledScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 1000); // Throttle to 1 second
    };

    window.addEventListener('scroll', throttledScroll);
    window.document.addEventListener('click', handleClick);
    window.document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      window.document.removeEventListener('click', handleClick);
      window.document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(scrollTimeout);
    };
  }, [trackableDoc, currentPage]);

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

      setTrackableDoc(data);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError('Erro ao carregar documento');
    } finally {
      setLoading(false);
    }
  };

  const trackEvent = async (eventType: string, pageNumber: number, data?: any) => {
    if (!trackableDoc) return;

    try {
      await supabase.functions.invoke('document-tracking', {
        body: {
          documentId: trackableDoc.id,
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

  if (error || !trackableDoc) {
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
    <div className="min-h-screen bg-black">
      {/* Full Screen Document Viewer */}
      <div className="w-full h-screen">
        <iframe
          src={trackableDoc.file_url}
          className="w-full h-full border-0"
          title={`Document ${trackableDoc.id}`}
          onLoad={() => trackEvent('iframe_load', 1)}
          style={{
            backgroundColor: 'white'
          }}
        />
      </div>
    </div>
  );
};

export default PublicDocumentViewer;