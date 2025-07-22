
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Eye, Clock, Search, Filter } from 'lucide-react';
import EmailDashboard from './EmailDashboard';

interface Email {
  id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  sent_at: string;
  status: string;
  email_events: Array<{
    event_type: string;
    timestamp: string;
  }>;
}

const EmailList = () => {
  return <EmailDashboard />;
};

export default EmailList;
