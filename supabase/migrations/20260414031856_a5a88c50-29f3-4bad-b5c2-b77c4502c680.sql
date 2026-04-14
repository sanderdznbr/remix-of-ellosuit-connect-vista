-- Enable pgmq extension
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create queues
SELECT pgmq.create('auth_emails');
SELECT pgmq.create('transactional_emails');

-- Create enqueue_email RPC wrapper
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pgmq.send(queue_name, payload);
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

-- Create read_email_batch RPC
CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INTEGER, visibility_timeout INTEGER DEFAULT 30)
RETURNS SETOF pgmq.message_record
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM pgmq.read(queue_name, visibility_timeout, batch_size);
END;
$$;

GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INTEGER, INTEGER) TO service_role;

-- Create delete_email RPC
CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, msg_id BIGINT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, msg_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;

-- Create move_to_dlq RPC
CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue TEXT, msg_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg_record pgmq.message_record;
BEGIN
  SELECT * INTO msg_record FROM pgmq.read(source_queue, 0, 1) WHERE msg_id = move_to_dlq.msg_id;
  IF FOUND THEN
    PERFORM pgmq.send(source_queue || '_dlq', msg_record.message);
    PERFORM pgmq.delete(source_queue, move_to_dlq.msg_id);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, BIGINT) TO service_role;