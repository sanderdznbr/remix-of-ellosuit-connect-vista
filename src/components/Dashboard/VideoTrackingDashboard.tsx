import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Play, Clock, Eye, TrendingUp, Upload, Plus, BarChart3, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface TrackedVideo {
  id: string;
  title: string;
  url: string;
  duration: number;
  views: number;
  avgWatchTime: number;
  completionRate: number;
  createdAt: string;
}

const VideoTrackingDashboard = () => {
  const { toast } = useToast();
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
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
    },
  ]);
  const [selectedVideo, setSelectedVideo] = useState<TrackedVideo | null>(null);

  const handleAddVideo = () => {
    if (!newVideoUrl) {
      toast({
        title: 'URL obrigatória',
        description: 'Digite a URL do vídeo',
        variant: 'destructive',
      });
      return;
    }

    const newVideo: TrackedVideo = {
      id: Math.random().toString(36).substring(7),
      title: newVideoTitle || 'Vídeo sem título',
      url: newVideoUrl,
      duration: Math.floor(Math.random() * 300) + 60,
      views: 0,
      avgWatchTime: 0,
      completionRate: 0,
      createdAt: new Date().toISOString(),
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
        {/* Add Video */}
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5" />
              Adicionar Vídeo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-4">
            <div className="space-y-2">
              <Label>URL do Vídeo (YouTube/Vimeo)</Label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                placeholder="Nome do vídeo"
                value={newVideoTitle}
                onChange={(e) => setNewVideoTitle(e.target.value)}
                className="h-11"
              />
            </div>
            <Button onClick={handleAddVideo} className="w-full h-11">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Vídeo
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
            <div className="space-y-3 max-h-80 overflow-y-auto">
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
                      <p className="font-medium text-sm truncate">{video.title}</p>
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
            <CardTitle className="text-lg">Análise: {selectedVideo.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            {/* Retention Graph Placeholder */}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VideoTrackingDashboard;
