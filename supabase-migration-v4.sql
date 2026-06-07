-- Duet v4 migration: collaborative strip label and paper style

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS paper_style TEXT DEFAULT 'porcelain';

UPDATE rooms
SET paper_style = 'porcelain'
WHERE paper_style IS NULL;

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_paper_style_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_paper_style_check
  CHECK (paper_style IN ('porcelain', 'milk', 'blush', 'sage', 'sky', 'charcoal'));
