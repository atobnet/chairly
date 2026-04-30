-- Phase 9: クーポン利用フロー

-- 1. coupons に used_at カラム追加（使用日時。NULLなら未使用）
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS used_at timestamptz;

-- 2. coupons に user_id ベースの INSERT ポリシー（webhook/service client は RLS bypass のため不要）
--    既存の SELECT ポリシーのみで OK（service client が used_at を更新するため）
