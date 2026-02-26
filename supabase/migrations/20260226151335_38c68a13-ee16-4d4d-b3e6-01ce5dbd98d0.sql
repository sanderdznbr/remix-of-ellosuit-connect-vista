CREATE OR REPLACE FUNCTION public.get_carousel_cover_images(carousel_ids uuid[])
RETURNS TABLE(carousel_id uuid, cover_image text)
LANGUAGE sql STABLE
AS $$
  SELECT id AS carousel_id, carousel_data->'cards'->0->>'imageUrl' AS cover_image
  FROM generated_carousels
  WHERE id = ANY(carousel_ids);
$$;