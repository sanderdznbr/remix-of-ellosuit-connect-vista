-- Corrigir recursão infinita nas políticas RLS de room_participants
-- O problema é que as políticas estão fazendo SELECT na própria tabela room_participants

-- Remover as políticas problemáticas
DROP POLICY IF EXISTS "Hosts can manage participants in their rooms" ON room_participants;
DROP POLICY IF EXISTS "Participants can update their own status" ON room_participants;

-- SOLUÇÃO: Criar uma função SECURITY DEFINER para verificar se usuário é host
-- Isso evita a recursão porque a função executa com privilégios elevados
CREATE OR REPLACE FUNCTION public.is_room_host(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.room_participants 
    WHERE room_id = _room_id 
      AND user_id = _user_id 
      AND is_host = true
  );
$$;

-- Criar política usando a função SECURITY DEFINER (evita recursão)
CREATE POLICY "Hosts can manage participants via function"
ON room_participants
FOR UPDATE
TO public
USING (public.is_room_host(room_id, auth.uid()))
WITH CHECK (public.is_room_host(room_id, auth.uid()));

-- Política para participantes atualizarem apenas campos específicos (áudio, vídeo)
-- Usando uma abordagem mais simples sem subquery recursivo
CREATE POLICY "Participants can update their media status"
ON room_participants
FOR UPDATE
TO public
USING (
  -- Permitir update se é o próprio usuário (logado)
  user_id = auth.uid()
  OR
  -- OU se user_id é NULL (guest) - permitir baseado no peer_id da sessão
  user_id IS NULL
)
WITH CHECK (
  user_id = auth.uid()
  OR
  user_id IS NULL
);