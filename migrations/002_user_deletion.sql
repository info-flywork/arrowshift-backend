-- Uygulama içi "Verilerimi Sil": kullanıcı satırı anonimleştirilip işaretlenir.
-- Oyun verileri silinir; purchase_transactions yasal saklama için kalır (kimliksiz).
ALTER TABLE users ADD COLUMN deleted_at DATETIME(3) NULL AFTER tutorial_seen;
