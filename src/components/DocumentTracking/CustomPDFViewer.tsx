import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PDFViewerFallback from './PDFViewerFallback';

// No longer using PDF.js for client-side rendering - using fallback approach

interface TrackableDocument {
  id: string;
  title: string;
  original_filename: string;
  file_url: string;
  tracking_enabled: boolean;
}

interface CustomPDFViewerProps {
  document: TrackableDocument;
}

const CustomPDFViewer: React.FC<CustomPDFViewerProps> = ({ document }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [pageStartTime, setPageStartTime] = useState<Record<number, number>>({});
  const [sessionStartTime] = useState(Date.now());
  
  const sessionId = useRef<string>(Math.random().toString(36).substring(7));
  const visitorId = useRef<string>(
    localStorage.getItem('visitor_id') || 
    (() => {
      const id = Math.random().toString(36).substring(7);
      localStorage.setItem('visitor_id', id);
      return id;
    })()
  );
  const timeInterval = useRef<NodeJS.Timeout | null>(null);

  // Silent tracking function - no console logs or visible indicators
  const trackEvent = useCallback(async (eventType: string, pageNumber: number, data?: any) => {
    try {
      await supabase.functions.invoke('document-tracking', {
        body: {
          documentId: document.id,
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
      // Silent fail - don't show errors to user
    }
  }, [document.id]);

const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1) Try to load pre-extracted images from storage first (fast path)
      const { data: extracted, error: listError } = await supabase.storage
        .from('trackable-documents')
        .list(`pages/${document.id}`, { limit: 500, sortBy: { column: 'name', order: 'asc' } });

      if (!listError && extracted && extracted.length > 0) {
        const urls = extracted
          .filter((f) => f.name.endsWith('.webp') || f.name.endsWith('.png') || f.name.endsWith('.jpg'))
          .map((f) => supabase.storage.from('trackable-documents').getPublicUrl(`pages/${document.id}/${f.name}`).data.publicUrl);

        if (urls.length > 0) {
          setPageImages(urls);
          setTotalPages(urls.length);

          // Track document open silently
          await trackEvent('document_open', 1, {
            title: document.title,
            filename: document.original_filename,
            totalPages: urls.length,
            sessionStartTime: sessionStartTime,
            method: 'images'
          });

          setPageStartTime({ 1: Date.now() });
          await trackEvent('page_view', 1);
          setLoading(false);
          return;
        }
      }

      // 2) If no extracted images found, use iframe fallback
      console.log('No extracted images found, using iframe fallback');
      setUseFallback(true);
      setLoading(false);
      
    } catch (err) {
      console.error('Error in loadPDF:', err);
      setUseFallback(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPDF();
  }, [document]);

  // Time tracking
  useEffect(() => {
    if (!loading && totalPages > 0) {
      if (timeInterval.current) {
        clearInterval(timeInterval.current);
      }

      timeInterval.current = setInterval(() => {
        const startTime = pageStartTime[currentPage];
        if (startTime) {
          const currentDuration = Date.now() - startTime;
          
          // Silent tracking every 30 seconds
          if (currentDuration % 30000 < 1000) {
            trackEvent('time_spent', currentPage, { 
              duration: currentDuration,
              cumulativeSessionTime: Date.now() - sessionStartTime
            });
          }
        }
      }, 1000);

      return () => {
        if (timeInterval.current) {
          clearInterval(timeInterval.current);
        }
      };
    }
  }, [currentPage, loading, totalPages, trackEvent]);

  // Track when user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      const startTime = pageStartTime[currentPage];
      if (startTime) {
        const duration = Date.now() - startTime;
        trackEvent('session_end', currentPage, { 
          totalDuration: duration,
          finalPage: currentPage,
          totalPagesVisited: Object.keys(pageStartTime).length,
          totalSessionTime: Date.now() - sessionStartTime
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentPage, pageStartTime, trackEvent]);

  const navigateToPage = async (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;

    // Track time on current page before leaving
    const startTime = pageStartTime[currentPage];
    if (startTime) {
      const duration = Date.now() - startTime;
      await trackEvent('page_leave', currentPage, { 
        duration,
        nextPage: newPage
      });
    }

    // Update current page
    setCurrentPage(newPage);
    
    // Set start time for new page
    const now = Date.now();
    setPageStartTime(prev => ({ ...prev, [newPage]: now }));
    
    // Track navigation silently
    await trackEvent('page_navigation', newPage, {
      fromPage: currentPage,
      toPage: newPage,
      navigationMethod: 'button'
    });

    await trackEvent('page_view', newPage);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      navigateToPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      navigateToPage(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Preparando documento...</p>
        </div>
      </div>
    );
  }

  if (useFallback) {
    return (
      <PDFViewerFallback 
        document={document} 
        onTrackEvent={trackEvent}
      />
    );
  }

  if (error || pageImages.length === 0) {
    return (
      <PDFViewerFallback 
        document={document} 
        onTrackEvent={trackEvent}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean minimal header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {document.title}
            </h1>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Página {currentPage} de {totalPages}
              </span>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="px-3"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="px-3"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document content - completely controlled */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {pageImages[currentPage - 1] && (
            <img
              src={pageImages[currentPage - 1]}
              alt={`Página ${currentPage}`}
              className="w-full h-auto"
              style={{ 
                maxWidth: '100%',
                display: 'block',
                margin: '0 auto'
              }}
            />
          )}
        </div>

        {/* Navigation buttons at bottom for better UX */}
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Página Anterior
            </Button>
            
            <span className="px-4 py-2 bg-gray-100 rounded-md text-sm font-medium">
              {currentPage} / {totalPages}
            </span>
            
            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              Próxima Página
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomPDFViewer;