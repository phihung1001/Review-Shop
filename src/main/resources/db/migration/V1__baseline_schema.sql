-- Full baseline for MySQL 8+. Keep immutable after release.

CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    auth_version INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE required_levels (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    description TEXT NOT NULL,
    `rank` INT NOT NULL DEFAULT 1,
    price_per_review DECIMAL(19,2) NOT NULL,
    version BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL
);

CREATE TABLE platform_settings (
    id BIGINT NOT NULL PRIMARY KEY,
    platform_fee_rate DECIMAL(5,4) NOT NULL,
    updated_by VARCHAR(255),
    version BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL
);

CREATE TABLE refresh_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    family_id VARCHAR(36) NOT NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    family_expires_at TIMESTAMP(6) NOT NULL,
    used_at TIMESTAMP(6),
    revoked_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uk_refresh_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_refresh_tokens_family ON refresh_tokens (family_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expiry ON refresh_tokens (expires_at);

CREATE TABLE password_reset_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL,
    user_id BIGINT NOT NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    used_at TIMESTAMP(6),
    failed_attempts INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_password_reset_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE google_maps_accounts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    freelancer_id BIGINT NOT NULL,
    contributor_id VARCHAR(30) NOT NULL,
    profile_url VARCHAR(500) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    thumbnail VARCHAR(2048),
    local_guide_level INT NOT NULL,
    points INT NOT NULL,
    review_count INT NOT NULL,
    account_type VARCHAR(20),
    active BOOLEAN NOT NULL,
    verified_at TIMESTAMP(6) NOT NULL,
    version BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uk_google_maps_accounts_contributor_id UNIQUE (contributor_id),
    CONSTRAINT fk_google_maps_accounts_freelancer FOREIGN KEY (freelancer_id) REFERENCES users (id)
);

CREATE TABLE jobs (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT NOT NULL,
    idempotency_key VARCHAR(100),
    request_fingerprint VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    link_map VARCHAR(2048) NOT NULL,
    required_level_id BIGINT NOT NULL,
    price_per_review DECIMAL(19,2) NOT NULL,
    review_contents JSON,
    price_per_task DECIMAL(19,2) NOT NULL,
    total_slots INT NOT NULL,
    available_slots INT NOT NULL,
    completed_slots INT NOT NULL,
    platform_fee_rate DECIMAL(5,4) NOT NULL,
    platform_fee_amount DECIMAL(19,2) NOT NULL,
    total_budget DECIMAL(19,2) NOT NULL,
    freelancer_budget DECIMAL(19,2) NOT NULL,
    remaining_budget DECIMAL(19,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    version BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uk_job_client_idempotency UNIQUE (client_id, idempotency_key),
    CONSTRAINT fk_jobs_client FOREIGN KEY (client_id) REFERENCES users (id),
    CONSTRAINT fk_jobs_required_level FOREIGN KEY (required_level_id) REFERENCES required_levels (id)
);

CREATE TABLE job_assignments (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    freelancer_id BIGINT NOT NULL,
    google_maps_account_id BIGINT,
    google_maps_account_name VARCHAR(255),
    google_maps_contributor_id VARCHAR(30),
    local_guide_level INT,
    google_maps_account_type VARCHAR(20),
    review_content_index INT,
    status VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    submitted_at TIMESTAMP(6),
    finished_at TIMESTAMP(6),
    version BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_job_assignments_job FOREIGN KEY (job_id) REFERENCES jobs (id),
    CONSTRAINT fk_job_assignments_freelancer FOREIGN KEY (freelancer_id) REFERENCES users (id),
    CONSTRAINT fk_job_assignments_google_account FOREIGN KEY (google_maps_account_id) REFERENCES google_maps_accounts (id)
);

CREATE TABLE job_proofs (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    assignment_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    freelancer_id BIGINT NOT NULL,
    review_content_index INT,
    review_content_snapshot TEXT,
    share_link VARCHAR(2048) NOT NULL,
    proof_images JSON NOT NULL,
    status VARCHAR(20) NOT NULL,
    rejection_reason TEXT,
    payout_amount DECIMAL(19,2) NOT NULL,
    reviewed_at TIMESTAMP(6),
    version BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uk_job_proofs_assignment UNIQUE (assignment_id),
    CONSTRAINT fk_job_proofs_assignment FOREIGN KEY (assignment_id) REFERENCES job_assignments (id),
    CONSTRAINT fk_job_proofs_job FOREIGN KEY (job_id) REFERENCES jobs (id),
    CONSTRAINT fk_job_proofs_freelancer FOREIGN KEY (freelancer_id) REFERENCES users (id)
);

CREATE TABLE account_balances (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    account_key VARCHAR(100) NOT NULL,
    account_type VARCHAR(30) NOT NULL,
    user_id BIGINT,
    currency VARCHAR(3) NOT NULL,
    available_amount DECIMAL(19,2) NOT NULL,
    held_amount DECIMAL(19,2) NOT NULL,
    version BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uk_account_balance_key UNIQUE (account_key),
    CONSTRAINT ck_account_balances_non_negative CHECK (available_amount >= 0 AND held_amount >= 0),
    CONSTRAINT fk_account_balances_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE account_transactions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    account_balance_id BIGINT NOT NULL,
    type VARCHAR(40) NOT NULL,
    available_delta DECIMAL(19,2) NOT NULL,
    held_delta DECIMAL(19,2) NOT NULL,
    available_after DECIMAL(19,2) NOT NULL,
    held_after DECIMAL(19,2) NOT NULL,
    reference_type VARCHAR(40) NOT NULL,
    reference_id VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(160) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uk_account_transaction_idempotency UNIQUE (idempotency_key),
    CONSTRAINT fk_account_transactions_balance FOREIGN KEY (account_balance_id) REFERENCES account_balances (id)
);

CREATE TABLE deposit_orders (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT NOT NULL,
    requested_amount DECIMAL(19,2) NOT NULL,
    received_amount DECIMAL(19,2),
    currency VARCHAR(3) NOT NULL,
    provider VARCHAR(40) NOT NULL,
    provider_reference VARCHAR(120),
    idempotency_key VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    completed_at TIMESTAMP(6),
    version BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uk_deposit_client_idempotency UNIQUE (client_id, idempotency_key),
    CONSTRAINT uk_deposit_provider_reference UNIQUE (provider, provider_reference),
    CONSTRAINT fk_deposit_orders_client FOREIGN KEY (client_id) REFERENCES users (id)
);
