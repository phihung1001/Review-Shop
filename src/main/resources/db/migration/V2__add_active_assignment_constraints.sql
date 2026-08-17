-- MySQL has no partial unique index. Nullable generated columns project only occupied rows;
-- UNIQUE permits multiple NULL values, so terminal assignments release the business key.
-- Existing databases must pass the duplicate preflight queries in docs/DATABASE_SCHEMA.md.

ALTER TABLE job_assignments
    ADD COLUMN active_freelancer_id BIGINT
        GENERATED ALWAYS AS (
            CASE
                WHEN status IN ('CLAIMED', 'SUBMITTED', 'APPROVED') THEN freelancer_id
                ELSE NULL
            END
        );

ALTER TABLE job_assignments
    ADD COLUMN active_review_content_index INT
        GENERATED ALWAYS AS (
            CASE
                WHEN status IN ('CLAIMED', 'SUBMITTED', 'APPROVED') THEN review_content_index
                ELSE NULL
            END
        );

ALTER TABLE job_assignments
    ADD CONSTRAINT uk_job_assignment_active_freelancer
        UNIQUE (job_id, active_freelancer_id);

ALTER TABLE job_assignments
    ADD CONSTRAINT uk_job_assignment_active_content
        UNIQUE (job_id, active_review_content_index);
