package com.example.reviewshopbackend;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class ExistingDatabaseMigrationIntegrationTest {

    @Test
    void existingHibernateSchemaIsBaselinedAtV1AndRunsLaterMigrations() {
        DataSource dataSource = existingSchemaDataSource();
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        jdbc.execute("""
                CREATE TABLE users (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY
                )
                """);
        jdbc.execute("""
                CREATE TABLE platform_settings (
                    id BIGINT PRIMARY KEY,
                    platform_fee_rate DECIMAL(5,4) NOT NULL,
                    updated_by VARCHAR(255),
                    version BIGINT NOT NULL,
                    created_at TIMESTAMP(6) NOT NULL,
                    updated_at TIMESTAMP(6) NOT NULL
                )
                """);
        jdbc.execute("""
                CREATE TABLE job_assignments (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    job_id BIGINT NOT NULL,
                    freelancer_id BIGINT NOT NULL,
                    review_content_index INT,
                    status VARCHAR(20) NOT NULL
                )
                """);
        jdbc.execute("""
                CREATE TABLE required_levels (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    `rank` INT NOT NULL DEFAULT 1
                )
                """);

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("1")
                .target("3")
                .load()
                .migrate();

        List<String> versions = jdbc.queryForList("""
                SELECT version
                FROM flyway_schema_history
                WHERE success = TRUE AND version IS NOT NULL
                ORDER BY installed_rank
                """, String.class);
        Integer generatedColumns = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'job_assignments'
                  AND column_name IN ('active_freelancer_id', 'active_review_content_index')
                """, Integer.class);
        Integer levelRankColumns = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'required_levels'
                  AND column_name = 'level_rank'
                """, Integer.class);

        assertThat(versions).containsExactly("1", "2", "3");
        assertThat(generatedColumns).isEqualTo(2);
        assertThat(levelRankColumns).isEqualTo(1);
    }

    private DataSource existingSchemaDataSource() {
        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:flyway_existing_database_test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        dataSource.setUser("sa");
        dataSource.setPassword("");
        return dataSource;
    }
}
