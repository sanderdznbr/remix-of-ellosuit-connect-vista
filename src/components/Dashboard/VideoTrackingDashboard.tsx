import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Play, Clock, Eye, TrendingUp, Upload, Plus, BarChart3, Users, Link, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDropzone } from 'react-dropzone';

interface TrackedVideo {
  id: string;
  title: string;
  url: string;
  file_url?: string;
  duration: number;
  views: number;
  avgWatchTime: number;
  completionRate: number;
  createdAt: string;
  publicId: string;
  is_uploaded?: boolean;
}

const VideoTrackingDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [videos, setVideos] = useState<TrackedVideo[]>([
    {
      id: '1',
      title: 'Apresentação do Produto',
      url: 'https://youtube.com/watch?v=example1',
      duration: 180,
      views: 524,
      avgWatchTime: 120,
      completionRate: 67,
      createdAt: new Date().toISOString(),
      publicId: 'vid-apresentacao-123',
    },
    {
      id: '2',
      title: 'Tutorial de Uso',
      url: 'https://vimeo.com/example2',
      duration: 420,
      views: 1250,
      avgWatchTime: 280,
      completionRate: 45,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      publicId: 'vid-tutorial-456',
    },
  ]);
  const [selectedVideo, setSelectedVideo] = useState<TrackedVideo | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareVideo, setShareVideo] = useState<TrackedVideo | null>(null);

  // Get company ID
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (data?.company_id) {
        setCompanyId(data.company_id);
      }
    };
    
    fetchCompanyId();
  }, [user?.id]);

  // File upload with drag and drop
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv']
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await handleVideoUpload(acceptedFiles[0]);
      }
    }
  });

  const handleVideoUpload = async (file: File) => {
    if (!user?.id || !companyId) {
      toast({
        title: 'Erro',
        description: 'Faça login para fazer upload',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${companyId}/videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setUploadProgress(100);

      const publicId = `vid-${Math.random().toString(36).substring(7)}`;
      
      const newVideo: TrackedVideo = {
        id: Math.random().toString(36).substring(7),
        title: newVideoTitle || file.name.replace(/\.[^/.]+$/, ''),
        url: publicUrl,
        file_url: publicUrl,
        duration: 0,
        views: 0,
        avgWatchTime: 0,
        completionRate: 0,
        createdAt: new Date().toISOString(),
        publicId,
        is_uploaded: true
      };

      setVideos([newVideo, ...videos]);
      setNewVideoTitle('');
      
      toast({
        title: 'Upload concluído!',
        description: 'Vídeo pronto para rastreamento.'
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível fazer upload do vídeo',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAddVideo = () => {
    if (!newVideoUrl) {
      toast({
        title: 'URL obrigatória',
        description: 'Digite a URL do vídeo',
        variant: 'destructive',
      });
      return;
    }

    const publicId = `vid-${Math.random().toString(36).substring(7)}`;
    
    const newVideo: TrackedVideo = {
      id: Math.random().toString(36).substring(7),
      title: newVideoTitle || 'Vídeo sem título',
      url: newVideoUrl,
      duration: Math.floor(Math.random() * 300) + 60,
      views: 0,
      avgWatchTime: 0,
      completionRate: 0,
      createdAt: new Date().toISOString(),
      publicId,
    };

    setVideos([newVideo, ...videos]);
    setNewVideoUrl('');
    setNewVideoTitle('');
    
    toast({
      title: 'Vídeo adicionado!',
      description: 'O vídeo foi configurado para rastreamento.',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPublicLink = (video: TrackedVideo) => {
    return `${window.location.origin}/video/${video.publicId}`;
  };

  const copyLink = async (video: TrackedVideo) => {
    const link = getPublicLink(video);
    await navigator.clipboard.writeText(link);
    toast({
      title: 'Link copiado!',
      description: 'Link público copiado para a área de transferência'
    });
  };

  const deleteVideo = (videoId: string) => {
    setVideos(videos.filter(v => v.id !== videoId));
    if (selectedVideo?.id === videoId) {
      setSelectedVideo(null);
    }
    toast({ title: 'Vídeo removido', description: 'O vídeo foi removido do rastreamento' });
  };

  const openShareModal = (video: TrackedVideo) => {
    setShareVideo(video);
    setShowShareModal(true);
  };

  return (
    <div className="page-content p-4 md:p-6 space-y-6 bg-muted/30 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Rastreamento de Vídeos</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Acompanhe engajamento e retenção dos seus vídeos</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-none shadow-md rounded-xl bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{videos.length}</p>
                <p className="text-xs text-muted-foreground">Vídeos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md rounded-xl bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Eye className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{videos.reduce((a, b) => a + b.views, 0)}</p>
                <p className="text-xs text-muted-foreground">Visualizações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md rounded-xl bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatDuration(Math.round(videos.reduce((a, b) => a + b.avgWatchTime, 0) / videos.length || 0))}
                </p>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md rounded-xl bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(videos.reduce((a, b) => a + b.completionRate, 0) / videos.length || 0)}%
                </p>
                <p className="text-xs text-muted-foreground">Taxa Conclusão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Video */}
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" />
              Upload de Vídeo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-4">
            <div className="space-y-2">
              <Label>Título do Vídeo</Label>
              <Input
                placeholder="Nome do vídeo"
                value={newVideoTitle}
                onChange={(e) => setNewVideoTitle(e.target.value)}
                className="h-11"
              />
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/20 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="space-y-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">{uploadProgress}% concluído</p>
                </div>
              ) : (
                <>
                  <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-muted-foreground">
                    {isDragActive 
                      ? 'Solte o vídeo aqui...' 
                      : 'Arraste um vídeo ou clique para selecionar'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    MP4, WebM, MOV, AVI (máx. 500MB)
                  </p>
                </>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou adicione por URL</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL do Vídeo (YouTube/Vimeo)</Label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                className="h-11"
              />
            </div>
            <Button onClick={handleAddVideo} className="w-full h-11" disabled={!newVideoUrl}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar por URL
            </Button>
          </CardContent>
        </Card>

        {/* Videos List */}
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Seus Vídeos ({videos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {videos.map((video) => (
                <div 
                  key={video.id} 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedVideo?.id === video.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setSelectedVideo(video)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Play className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{video.title}</p>
                        {video.is_uploaded && (
                          <Badge variant="secondary" className="text-[10px]">Upload</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{video.url}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {video.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(video.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {video.completionRate}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openShareModal(video);
                        }}
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteVideo(video.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Video Details */}
      {selectedVideo && (
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Análise: {selectedVideo.title}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openShareModal(selectedVideo)}>
                <Link className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-3xl font-bold text-primary">{selectedVideo.views}</p>
                <p className="text-sm text-muted-foreground">Visualizações</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600">{formatDuration(selectedVideo.avgWatchTime)}</p>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-3xl font-bold text-purple-600">{selectedVideo.completionRate}%</p>
                <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-3xl font-bold text-orange-600">{formatDuration(selectedVideo.duration)}</p>
                <p className="text-sm text-muted-foreground">Duração Total</p>
              </div>
            </div>

            {/* Retention Graph */}
            <div className="space-y-3">
              <h4 className="font-medium">Retenção por Tempo</h4>
              <div className="space-y-2">
                {[0, 25, 50, 75, 100].map((percent) => (
                  <div key={percent} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12">{percent}%</span>
                    <Progress value={100 - (percent * 0.6)} className="flex-1" />
                    <span className="text-xs text-muted-foreground w-16">{Math.round((100 - percent * 0.6) * selectedVideo.views / 100)} views</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Plays Iniciados</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{selectedVideo.views}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Completaram</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  {Math.round(selectedVideo.views * selectedVideo.completionRate / 100)}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Tempo Total Assistido</p>
                <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                  {formatDuration(selectedVideo.avgWatchTime * selectedVideo.views)}
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Taxa de Pausa</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                  {Math.round(100 - selectedVideo.completionRate)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Vídeo</DialogTitle>
          </DialogHeader>
          {shareVideo && (
            <div className="space-y-4">
              <div>
                <Label>Link Público</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={getPublicLink(shareVideo)}
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={() => copyLink(shareVideo)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Este link abre o vídeo em tela cheia com rastreamento completo.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium text-sm">O que será rastreado:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Hora de entrada e saída</li>
                  <li>• Tempo total na página</li>
                  <li>• Tempo de vídeo assistido</li>
                  <li>• Tempo pausado</li>
                  <li>• % do vídeo assistido</li>
                  <li>• Play, Pause, Seek events</li>
                </ul>
              </div>

              <Button
                className="w-full"
                onClick={() => window.open(getPublicLink(shareVideo), '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Preview
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoTrackingDashboard;
