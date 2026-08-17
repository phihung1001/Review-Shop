ALTER TABLE platform_settings
    ADD COLUMN withdrawal_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN withdrawal_min_amount DECIMAL(19,2) NOT NULL DEFAULT 100000.00,
    ADD COLUMN withdrawal_fee_type VARCHAR(20) NOT NULL DEFAULT 'FIXED',
    ADD COLUMN withdrawal_fee_value DECIMAL(19,4) NOT NULL DEFAULT 5000.0000;

CREATE TABLE payout_methods (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    freelancer_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    bank_code VARCHAR(20) NOT NULL,
    bank_name VARCHAR(120) NOT NULL,
    account_number_encrypted TEXT NOT NULL,
    account_number_last4 VARCHAR(4) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    qr_image_object_key VARCHAR(512),
    status VARCHAR(20) NOT NULL,
    is_default BOOLEAN NOT NULL,
    version BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_payout_methods_freelancer FOREIGN KEY (freelancer_id) REFERENCES users (id)
);

CREATE INDEX idx_payout_methods_freelancer ON payout_methods (freelancer_id);

CREATE TABLE withdrawals (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40),
    freelancer_id BIGINT NOT NULL,
    payout_method_id BIGINT,
    amount DECIMAL(19,2) NOT NULL,
    fee_amount DECIMAL(19,2) NOT NULL,
    net_amount DECIMAL(19,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    request_fingerprint VARCHAR(64) NOT NULL,
    payout_type_snapshot VARCHAR(20) NOT NULL,
    bank_code_snapshot VARCHAR(20) NOT NULL,
    bank_name_snapshot VARCHAR(120) NOT NULL,
    account_number_encrypted_snapshot TEXT NOT NULL,
    account_number_last4_snapshot VARCHAR(4) NOT NULL,
    account_holder_name_snapshot VARCHAR(255) NOT NULL,
    qr_image_object_key_snapshot VARCHAR(512),
    provider VARCHAR(40),
    provider_reference VARCHAR(120),
    failure_reason VARCHAR(1000),
    admin_note VARCHAR(1000),
    processed_by BIGINT,
    processed_at TIMESTAMP(6),
    completed_at TIMESTAMP(6),
    version BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uk_withdrawal_code UNIQUE (code),
    CONSTRAINT uk_withdrawal_freelancer_idempotency UNIQUE (freelancer_id, idempotency_key),
    CONSTRAINT uk_withdrawal_provider_reference UNIQUE (provider, provider_reference),
    CONSTRAINT ck_withdrawal_amounts CHECK (amount > 0 AND fee_amount >= 0 AND net_amount >= 0 AND amount = fee_amount + net_amount),
    CONSTRAINT fk_withdrawals_freelancer FOREIGN KEY (freelancer_id) REFERENCES users (id),
    CONSTRAINT fk_withdrawals_payout_method FOREIGN KEY (payout_method_id) REFERENCES payout_methods (id),
    CONSTRAINT fk_withdrawals_processed_by FOREIGN KEY (processed_by) REFERENCES users (id)
);

CREATE INDEX idx_withdrawals_freelancer_created ON withdrawals (freelancer_id, created_at);
CREATE INDEX idx_withdrawals_status_created ON withdrawals (status, created_at);
