-- Duet v5 migration: expanded paper style catalog

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_paper_style_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_paper_style_check
  CHECK (paper_style IN (
    'porcelain',
    'milk',
    'blush',
    'rose',
    'butter',
    'sage',
    'mint',
    'sky',
    'lilac',
    'pearl',
    'ticket',
    'charcoal'
  ));
