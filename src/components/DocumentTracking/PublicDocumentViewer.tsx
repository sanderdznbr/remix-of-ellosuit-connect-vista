import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, ChevronLeft, ChevronRight, FileText, Clock, Eye } from 'lucide-react';
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
  const [totalPages, setTotalPages] = useState(1);
  const [pageStartTime, setPageStartTime] = useState<Record<number, number>>({});
  const [sessionStartTime] = useState(Date.now());
  const [timeOnCurrentPage, setTimeOnCurrentPage] = useState(0);
  const [pagesVisited, setPagesVisited] = useState<Set<number>>(new Set([1]));
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sessionId = useRef<string>(Math.random().toString(36).substring(7));
  const visitorId = useRef<string>(
    localStorage.getItem('visitor_id') || 
    (() => {
      const id = Math.random().toString(36).substring(7);
      localStorage.setItem('visitor_id', id);
      return id;
    })()
  );
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDocument();
  }, [linkId]);

  useEffect(() => {
    if (trackableDoc) {
      // Track document open
      trackEvent('document_open', currentPage, {
        title: trackableDoc.title,
        filename: trackableDoc.original_filename,
        sessionStartTime: sessionStartTime
      });

      // Set start time for current page
      const now = Date.now();
      setPageStartTime(prev => ({ ...prev, [currentPage]: now }));

      // Track page view
      trackEvent('page_view', currentPage, {
        pagesVisitedSoFar: Array.from(pagesVisited).sort(),
        sessionDuration: now - sessionStartTime
      });

      // Start time tracking for current page
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }

      timeUpdateInterval.current = setInterval(() => {
        const startTime = pageStartTime[currentPage];
        if (startTime) {
          const currentDuration = Date.now() - startTime;
          setTimeOnCurrentPage(Math.floor(currentDuration / 1000));
          
          // Track time spent every 15 seconds
          if (currentDuration % 15000 < 1000) {
            trackEvent('time_spent', currentPage, { 
              duration: currentDuration,
              cumulativeSessionTime: Date.now() - sessionStartTime
            });
          }
        }
      }, 1000);

      // Track when user leaves the page/document
      const handleBeforeUnload = () => {
        const startTime = pageStartTime[currentPage];
        if (startTime) {
          const duration = Date.now() - startTime;
          trackEvent('session_end', currentPage, { 
            totalDuration: duration,
            finalPage: currentPage,
            totalPagesVisited: pagesVisited.size,
            pagesVisited: Array.from(pagesVisited).sort(),
            totalSessionTime: Date.now() - sessionStartTime
          });
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        if (timeUpdateInterval.current) {
          clearInterval(timeUpdateInterval.current);
        }
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        // Track final time on page when component unmounts
        const startTime = pageStartTime[currentPage];
        if (startTime) {
          const duration = Date.now() - startTime;
          trackEvent('time_spent', currentPage, { 
            duration,
            final: true,
            totalSessionTime: Date.now() - sessionStartTime
          });
        }
      };
    }
  }, [trackableDoc, currentPage, pagesVisited]);

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
          data: {
            ...data,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
          },
          visitorId: visitorId.current
        }
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  };

  const navigateToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;

    // Track time spent on current page before navigating
    const startTime = pageStartTime[currentPage];
    if (startTime) {
      const duration = Date.now() - startTime;
      trackEvent('page_leave', currentPage, { 
        duration,
        nextPage: newPage,
        navigationMethod: 'button'
      });
    }

    // Navigate to new page
    setCurrentPage(newPage);
    setPagesVisited(prev => new Set([...prev, newPage]));
    
    // Track navigation
    trackEvent('page_navigation', newPage, {
      fromPage: currentPage,
      toPage: newPage,
      navigationMethod: 'button',
      pagesVisitedInSession: Array.from(pagesVisited).sort()
    });

    // Update iframe src with page anchor if it's a PDF
    if (iframeRef.current && trackableDoc?.file_url) {
      const url = new URL(trackableDoc.file_url);
      url.hash = `page=${newPage}`;
      iframeRef.current.src = url.toString();
    }
  };

  const handlePrevPage = () => {
    navigateToPage(currentPage - 1);
  };

  const handleNextPage = () => {
    navigateToPage(currentPage + 1);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Document Header with Controls */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Document Info */}
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <h1 className="font-semibold text-gray-900">{trackableDoc.title}</h1>
                <p className="text-sm text-gray-500">{trackableDoc.original_filename}</p>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{Math.floor(timeOnCurrentPage / 60)}:{(timeOnCurrentPage % 60).toString().padStart(2, '0')}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-md">
                  <span className="text-sm font-medium">
                    Página {currentPage} de {totalPages}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Session Stats */}
              <div className="flex items-center gap-2 text-sm text-gray-600 border-l pl-4">
                <Eye className="h-4 w-4" />
                <span>{pagesVisited.size} página{pagesVisited.size !== 1 ? 's' : ''} visitada{pagesVisited.size !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="h-[calc(100vh-80px)] bg-white">
        <iframe
          ref={iframeRef}
          src={trackableDoc.file_url}
          className="w-full h-full border-0"
          title={`Document ${trackableDoc.id}`}
          onLoad={() => {
            trackEvent('iframe_load', currentPage);
            // Try to detect total pages (this is limited with PDFs in iframes)
            setTotalPages(10); // Default assumption, could be improved with PDF.js
          }}
          style={{
            backgroundColor: 'white'
          }}
        />
      </div>
    </div>
  );
};

export default PublicDocumentViewer;