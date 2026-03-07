UPDATE profiles SET phone_verified = false, whatsapp = NULL WHERE id = '08e2c738-3682-4fcb-b1d6-b0c8af9ebc67';
DELETE FROM phone_verifications WHERE user_id = '08e2c738-3682-4fcb-b1d6-b0c8af9ebc67';