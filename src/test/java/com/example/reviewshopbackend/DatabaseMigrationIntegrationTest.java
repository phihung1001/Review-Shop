package com.example.reviewshopbackend;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:flyway_fresh_database_test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.enabled=true",
        "spring.flyway.baseline-on-migrate=true",
        "spring.flyway.baseline-version=1",
        "spring.flyway.target=3",
        "spring.jpa.hibernate.ddl-auto=none"
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class DatabaseMigrationIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void freshDatabaseRunsAllMigrations() {
        Integer businessTableCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name IN (
                    'users', 'required_levels', 'platform_settings', 'refresh_tokens',
                    'password_reset_tokens', 'google_maps_accounts', 'jobs', 'job_assignments',
                    'job_proofs', 'account_balances', 'account_transactions', 'deposit_orders'
                  )
                """, Integer.class);

        List<String> successfulVersions = jdbcTemplate.queryForList("""
                SELECT version
                FROM flyway_schema_history
                WHERE success = TRUE
                  AND version IS NOT NULL
                ORDER BY installed_rank
                """, String.class);

        Integer levelRankColumnCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'required_levels'
                  AND column_name = 'level_rank'
                """, Integer.class);

        Integer legacyRankColumnCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'required_levels'
                  AND column_name = 'rank'
                """, Integer.class);

        assertThat(businessTableCount).isEqualTo(12);
        assertThat(successfulVersions).containsExactly("1", "2", "3");
        assertThat(levelRankColumnCount).isEqualTo(1);
        assertThat(legacyRankColumnCount).isZero();
    }
}
