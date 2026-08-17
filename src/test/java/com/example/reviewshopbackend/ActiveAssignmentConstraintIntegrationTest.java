package com.example.reviewshopbackend;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import com.example.reviewshopbackend.entity.AssignmentStatus;
import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobAssignment;
import com.example.reviewshopbackend.entity.JobStatus;
import com.example.reviewshopbackend.entity.RequiredLevel;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.JobAssignmentRepository;
import com.example.reviewshopbackend.repository.JobRepository;
import com.example.reviewshopbackend.repository.RequiredLevelRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.annotation.DirtiesContext;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:active_assignment_constraint_test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ActiveAssignmentConstraintIntegrationTest {
    @Autowired DataSource dataSource;
    @Autowired UserRepository userRepository;
    @Autowired RequiredLevelRepository requiredLevelRepository;
    @Autowired JobRepository jobRepository;
    @Autowired JobAssignmentRepository assignmentRepository;

    @BeforeAll
    void applyMigration() {
        new ResourceDatabasePopulator(new ClassPathResource(
                "db/migration/V2__add_active_assignment_constraints.sql")).execute(dataSource);
    }

    @Test
    void blocksTwoOccupiedAssignmentsForSameFreelancerAndJobButAllowsRetryAfterRejection() {
        Job job = createJob();
        User freelancer = createFreelancer();
        assignmentRepository.saveAndFlush(assignment(job, freelancer, 0, AssignmentStatus.REJECTED));
        assignmentRepository.saveAndFlush(assignment(job, freelancer, 0, AssignmentStatus.CLAIMED));

        assertThrows(DataIntegrityViolationException.class, () ->
                assignmentRepository.saveAndFlush(assignment(job, freelancer, 1, AssignmentStatus.SUBMITTED)));
    }

    @Test
    void blocksTwoOccupiedAssignmentsForSameReviewContentButAllowsMultipleNullContents() {
        Job job = createJob();
        User first = createFreelancer();
        User second = createFreelancer();
        User third = createFreelancer();
        User fourth = createFreelancer();
        assignmentRepository.saveAndFlush(assignment(job, first, 0, AssignmentStatus.CLAIMED));

        assertThrows(DataIntegrityViolationException.class, () ->
                assignmentRepository.saveAndFlush(assignment(job, second, 0, AssignmentStatus.CLAIMED)));

        assertDoesNotThrow(() -> {
            assignmentRepository.saveAndFlush(assignment(job, third, null, AssignmentStatus.CLAIMED));
            assignmentRepository.saveAndFlush(assignment(job, fourth, null, AssignmentStatus.CLAIMED));
        });
    }

    private JobAssignment assignment(
            Job job,
            User freelancer,
            Integer contentIndex,
            AssignmentStatus status
    ) {
        JobAssignment assignment = new JobAssignment();
        assignment.setJob(job);
        assignment.setFreelancer(freelancer);
        assignment.setReviewContentIndex(contentIndex);
        assignment.setStatus(status);
        assignment.setExpiresAt(Instant.now().plusSeconds(600));
        return assignment;
    }

    private Job createJob() {
        User client = new User();
        client.setFullName("Constraint Client");
        client.setEmail("constraint-client-" + UUID.randomUUID() + "@example.com");
        client.setPasswordHash("not-used");
        client.setRole(UserRole.CLIENT);
        client = userRepository.saveAndFlush(client);

        RequiredLevel level = new RequiredLevel();
        level.setDescription("Constraint level " + UUID.randomUUID());
        level.setPricePerReview(new BigDecimal("10000.00"));
        level = requiredLevelRepository.saveAndFlush(level);

        Job job = new Job();
        job.setClient(client);
        job.setTitle("Constraint job");
        job.setDescription("Constraint test");
        job.setMapLink("https://www.google.com/maps/place/example");
        job.setRequiredLevel(level);
        job.setPricePerReview(new BigDecimal("10000.00"));
        job.setReviewContents(List.of());
        job.setPricePerTask(new BigDecimal("5000.00"));
        job.setTotalReviews(4);
        job.setAvailableSlots(4);
        job.setCompletedSlots(0);
        job.setPlatformFeeRate(new BigDecimal("0.5000"));
        job.setPlatformFeeAmount(new BigDecimal("20000.00"));
        job.setTotalBudget(new BigDecimal("40000.00"));
        job.setFreelancerBudget(new BigDecimal("20000.00"));
        job.setRemainingFreelancerBudget(new BigDecimal("20000.00"));
        job.setStatus(JobStatus.OPEN);
        return jobRepository.saveAndFlush(job);
    }

    private User createFreelancer() {
        User freelancer = new User();
        freelancer.setFullName("Constraint Freelancer");
        freelancer.setEmail("constraint-freelancer-" + UUID.randomUUID() + "@example.com");
        freelancer.setPasswordHash("not-used");
        freelancer.setRole(UserRole.FREELANCER);
        return userRepository.saveAndFlush(freelancer);
    }
}
