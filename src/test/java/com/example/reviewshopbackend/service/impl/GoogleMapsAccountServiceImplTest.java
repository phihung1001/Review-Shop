package com.example.reviewshopbackend.service.impl;

import java.util.Optional;

import com.example.reviewshopbackend.entity.GoogleMapsAccount;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.exception.InvalidGoogleMapsAccountException;
import com.example.reviewshopbackend.repository.GoogleMapsAccountRepository;
import com.example.reviewshopbackend.repository.JobRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.SerpApiContributorClient;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GoogleMapsAccountServiceImplTest {
    @Test
    void verifiesLongContributorUrlAndStoresSerpApiProfile() {
        Fixture fixture = fixture(new SerpApiContributorClient.ContributorProfile(
                "Local Guide A", "https://image.example/a", 1500, 6, true, 25));
        when(fixture.repository.saveAndFlush(any(GoogleMapsAccount.class))).thenAnswer(invocation -> {
            GoogleMapsAccount account = invocation.getArgument(0);
            account.setId(10L);
            return account;
        });

        var response = fixture.service.verify(
                "https://www.google.com/maps/contrib/117642509766343273456/contribute/@15.8,101.9,12z?hl=vi",
                "freelancer@example.com");

        assertEquals("117642509766343273456", response.contributorId());
        assertEquals("Local Guide A", response.accountName());
        assertEquals(6, response.localGuideLevel());
        assertEquals(25, response.reviewCount());
        assertFalse(response.readyForJobs());
    }

    @Test
    void rejectsContributorWithoutPublishedReview() {
        Fixture fixture = fixture(new SerpApiContributorClient.ContributorProfile(
                "No reviews", null, 0, 1, true, 0));

        InvalidGoogleMapsAccountException exception = assertThrows(InvalidGoogleMapsAccountException.class,
                () -> fixture.service.verify(
                        "https://www.google.com/maps/contrib/117642509766343273456", "freelancer@example.com"));
        assertEquals("Google Maps account must be a Local Guide with at least one published review",
                exception.getMessage());
        verify(fixture.repository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsSpoofedGoogleDomain() {
        Fixture fixture = fixture(new SerpApiContributorClient.ContributorProfile("A", null, 10, 1, true, 1));
        assertThrows(IllegalArgumentException.class, () -> fixture.service.verify(
                "https://google.com.evil.example/maps/contrib/117642509766343273456", "freelancer@example.com"));
        verifyNoInteractions(fixture.client);
    }

    private static Fixture fixture(SerpApiContributorClient.ContributorProfile profile) {
        GoogleMapsAccountRepository repository = mock(GoogleMapsAccountRepository.class);
        UserRepository users = mock(UserRepository.class);
        JobRepository jobs = mock(JobRepository.class);
        SerpApiContributorClient client = mock(SerpApiContributorClient.class);
        User freelancer = new User();
        freelancer.setId(1L);
        freelancer.setEmail("freelancer@example.com");
        freelancer.setRole(UserRole.FREELANCER);
        when(users.findByEmail("freelancer@example.com")).thenReturn(Optional.of(freelancer));
        when(client.fetch("117642509766343273456")).thenReturn(profile);
        return new Fixture(new GoogleMapsAccountServiceImpl(repository, users, jobs, client), repository, client);
    }

    private record Fixture(GoogleMapsAccountServiceImpl service, GoogleMapsAccountRepository repository,
                           SerpApiContributorClient client) {}
}
