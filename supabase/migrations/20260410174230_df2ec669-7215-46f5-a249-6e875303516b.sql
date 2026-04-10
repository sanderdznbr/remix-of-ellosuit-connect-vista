-- Support chat conversations
CREATE TABLE public.support_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  message_count int NOT NULL DEFAULT 0
);

ALTER TABLE public.support_chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own support conversations"
  ON public.support_chat_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create support conversations"
  ON public.support_chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own support conversations"
  ON public.support_chat_conversations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Support chat messages
CREATE TABLE public.support_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.support_chat_conversations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own support messages"
  ON public.support_chat_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.support_chat_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add support messages"
  ON public.support_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.support_chat_conversations WHERE user_id = auth.uid()
    )
  );