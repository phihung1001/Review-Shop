package com.example.reviewshopbackend.service;

import java.math.BigDecimal;

import com.example.reviewshopbackend.entity.AccountBalance;
import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobProof;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.Withdrawal;

public interface AccountBalanceService {
    AccountBalance getOrCreate(User user);
    void creditDeposit(User client, BigDecimal amount, String depositReference);
    void holdJobFunds(User client, Job job);
    void releaseJobReward(JobProof proof);
    void settleCompletedJob(Job job);
    void holdWithdrawal(Withdrawal withdrawal);
    void completeWithdrawal(Withdrawal withdrawal);
    void releaseWithdrawal(Withdrawal withdrawal);
}
