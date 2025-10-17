-- PARTE 1: Habilitar RLS na tabela room_participants (CRÍTICO)
-- Esta é a causa raiz do problema de aprovação de participantes
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- PARTE 2: Melhorar as políticas RLS para maior segurança
-- Remover a política muito permissiva existente
DROP POLICY IF EXISTS "Allow participant updates" ON room_participants;

-- Criar política para hosts poderem aprovar/gerenciar participantes
CREATE POLICY "Hosts can manage participants in their rooms"
ON room_participants
FOR UPDATE
TO public
USING (
  -- Permitir se o usuário é host da sala
  room_id IN (
    SELECT room_id 
    FROM room_participants 
    WHERE user_id = auth.uid() AND is_host = true
  )
)
WITH CHECK (
  -- Permitir se o usuário é host da sala
  room_id IN (
    SELECT room_id 
    FROM room_participants 
    WHERE user_id = auth.uid() AND is_host = true
  )
);

-- Criar política para participantes atualizarem seu próprio status (áudio, vídeo, etc)
CREATE POLICY "Participants can update their own status"
ON room_participants
FOR UPDATE
TO public
USING (
  -- Permitir atualização do próprio registro (para usuários logados)
  user_id = auth.uid()
  OR
  -- Permitir para guests (quando user_id é NULL, comparar pelo id)
  (user_id IS NULL AND id IN (
    SELECT id FROM room_participants WHERE id = room_participants.id
  ))
)
WITH CHECK (
  user_id = auth.uid()
  OR
  (user_id IS NULL AND id IN (
    SELECT id FROM room_participants WHERE id = room_participants.id
  ))
);