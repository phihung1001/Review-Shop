package com.example.reviewshopbackend.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;

import com.example.reviewshopbackend.entity.AccountBalance;
import com.example.reviewshopbackend.entity.AccountTransaction;
import com.example.reviewshopbackend.entity.AccountTransactionType;
import com.example.reviewshopbackend.entity.AccountType;
import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobProof;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.Withdrawal;
import com.example.reviewshopbackend.exception.InsufficientBalanceException;
import com.example.reviewshopbackend.repository.AccountBalanceRepository;
import com.example.reviewshopbackend.repository.AccountTransactionRepository;
import com.example.reviewshopbackend.service.AccountBalanceService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountBalanceServiceImpl implements AccountBalanceService {
    public static final String CURRENCY = "VND";

    private final AccountBalanceRepository balanceRepository;
    private final AccountTransactionRepository transactionRepository;

    public AccountBalanceServiceImpl(
            AccountBalanceRepository balanceRepository,
            AccountTransactionRepository transactionRepository
    ) {
        this.balanceRepository = balanceRepository;
        this.transactionRepository = transactionRepository;
    }

    @Override
    @Transactional
    public AccountBalance getOrCreate(User user) {
        String key = userKey(user);
        return balanceRepository.findByAccountKey(key).orElseGet(() -> createUserAccount(user, key));
    }

    @Override
    @Transactional
    public void creditDeposit(User client, BigDecimal amount, String depositReference) {
        BigDecimal normalized = money(amount);
        requirePositive(normalized);
        String idempotencyKey = "DEPOSIT:" + depositReference;
        AccountBalance account = lockUserAccount(client);
        if (transactionRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            return;
        }
        apply(account, normalized, BigDecimal.ZERO, AccountTransactionType.DEPOSIT,
                "DEPOSIT_ORDER", depositReference, idempotencyKey);
    }

    @Override
    @Transactional
    public void holdJobFunds(User client, Job job) {
        BigDecimal amount = money(job.getTotalBudget());
        String reference = job.getId().toString();
        String idempotencyKey = "JOB_HOLD:" + reference;
        AccountBalance account = lockUserAccount(client);
        if (transactionRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            return;
        }
        if (account.getAvailableAmount().compareTo(amount) < 0) {
            throw new InsufficientBalanceException("Client available balance is insufficient to fund this job");
        }
        apply(account, amount.negate(), amount, AccountTransactionType.JOB_FUND_HOLD,
                "JOB", reference, idempotencyKey);
    }

    @Override
    @Transactional
    public void releaseJobReward(JobProof proof) {
        String reference = proof.getId().toString();
        String debitKey = "JOB_REWARD:" + reference + ":ESCROW";
        String creditKey = "JOB_REWARD:" + reference + ":FREELANCER";
        AccountBalance client = lockUserAccount(proof.getJob().getClient());
        AccountBalance freelancer = lockUserAccount(proof.getFreelancer());
        if (transactionRepository.findByIdempotencyKey(creditKey).isPresent()) {
            return;
        }
        BigDecimal payout = money(proof.getPayoutAmount());
        if (client.getHeldAmount().compareTo(payout) < 0) {
            throw new InsufficientBalanceException("Job escrow balance is insufficient");
        }
        apply(client, BigDecimal.ZERO, payout.negate(), AccountTransactionType.JOB_REWARD,
                "JOB_PROOF", reference, debitKey);
        apply(freelancer, payout, BigDecimal.ZERO, AccountTransactionType.JOB_REWARD,
                "JOB_PROOF", reference, creditKey);
    }

    @Override
    @Transactional
    public void settleCompletedJob(Job job) {
        String reference = job.getId().toString();
        AccountBalance client = lockUserAccount(job.getClient());
        AccountBalance platform = lockPlatformAccount();

        BigDecimal fee = money(job.getPlatformFeeAmount());
        if (fee.signum() > 0 && transactionRepository
                .findByIdempotencyKey("PLATFORM_FEE:" + reference + ":CREDIT").isEmpty()) {
            if (client.getHeldAmount().compareTo(fee) < 0) {
                throw new InsufficientBalanceException("Job escrow balance is insufficient for platform fee");
            }
            apply(client, BigDecimal.ZERO, fee.negate(), AccountTransactionType.PLATFORM_FEE,
                    "JOB", reference, "PLATFORM_FEE:" + reference + ":ESCROW");
            apply(platform, fee, BigDecimal.ZERO, AccountTransactionType.PLATFORM_FEE,
                    "JOB", reference, "PLATFORM_FEE:" + reference + ":CREDIT");
        }

        BigDecimal remainder = money(job.getRemainingFreelancerBudget());
        if (remainder.signum() > 0 && transactionRepository
                .findByIdempotencyKey("JOB_REMAINDER_REFUND:" + reference).isEmpty()) {
            if (client.getHeldAmount().compareTo(remainder) < 0) {
                throw new InsufficientBalanceException("Job escrow balance is insufficient for remainder refund");
            }
            apply(client, remainder, remainder.negate(), AccountTransactionType.JOB_REMAINDER_REFUND,
                    "JOB", reference, "JOB_REMAINDER_REFUND:" + reference);
        }
    }

    @Override
    @Transactional
    public void holdWithdrawal(Withdrawal withdrawal) {
        String reference = withdrawal.getId().toString();
        String key = "WITHDRAWAL:" + reference + ":HOLD";
        AccountBalance account = lockUserAccount(withdrawal.getFreelancer());
        if (transactionRepository.findByIdempotencyKey(key).isPresent()) return;
        BigDecimal amount = money(withdrawal.getAmount());
        if (account.getAvailableAmount().compareTo(amount) < 0)
            throw new InsufficientBalanceException("Freelancer available balance is insufficient for this withdrawal");
        apply(account, amount.negate(), amount, AccountTransactionType.WITHDRAWAL_HOLD,
                "WITHDRAWAL", reference, key);
    }

    @Override
    @Transactional
    public void completeWithdrawal(Withdrawal withdrawal) {
        String reference = withdrawal.getId().toString();
        String key = "WITHDRAWAL:" + reference + ":COMPLETE";
        AccountBalance account = lockUserAccount(withdrawal.getFreelancer());
        if (transactionRepository.findByIdempotencyKey(key).isPresent()) return;
        BigDecimal amount = money(withdrawal.getAmount());
        if (account.getHeldAmount().compareTo(amount) < 0)
            throw new InsufficientBalanceException("Freelancer held balance is insufficient for this withdrawal");
        apply(account, BigDecimal.ZERO, amount.negate(), AccountTransactionType.WITHDRAWAL_COMPLETED,
                "WITHDRAWAL", reference, key);
    }

    @Override
    @Transactional
    public void releaseWithdrawal(Withdrawal withdrawal) {
        String reference = withdrawal.getId().toString();
        String key = "WITHDRAWAL:" + reference + ":RELEASE";
        AccountBalance account = lockUserAccount(withdrawal.getFreelancer());
        if (transactionRepository.findByIdempotencyKey(key).isPresent()) return;
        BigDecimal amount = money(withdrawal.getAmount());
        if (account.getHeldAmount().compareTo(amount) < 0)
            throw new InsufficientBalanceException("Freelancer held balance is insufficient for this withdrawal");
        apply(account, amount, amount.negate(), AccountTransactionType.WITHDRAWAL_RELEASE,
                "WITHDRAWAL", reference, key);
    }

    private AccountBalance lockUserAccount(User user) {
        String key = userKey(user);
        var locked = balanceRepository.findByAccountKeyForUpdate(key);
        if (locked.isPresent()) {
            return locked.orElseThrow();
        }
        createUserAccount(user, key);
        return balanceRepository.findByAccountKeyForUpdate(key).orElseThrow();
    }

    private AccountBalance lockPlatformAccount() {
        String key = "PLATFORM_REVENUE:" + CURRENCY;
        var locked = balanceRepository.findByAccountKeyForUpdate(key);
        if (locked.isPresent()) {
            return locked.orElseThrow();
        }
        AccountBalance account = new AccountBalance();
        account.setAccountKey(key);
        account.setAccountType(AccountType.PLATFORM_REVENUE);
        account.setCurrency(CURRENCY);
        saveNewAccount(account);
        return balanceRepository.findByAccountKeyForUpdate(key).orElseThrow();
    }

    private AccountBalance createUserAccount(User user, String key) {
        AccountBalance account = new AccountBalance();
        account.setAccountKey(key);
        account.setAccountType(AccountType.USER);
        account.setUser(user);
        account.setCurrency(CURRENCY);
        return saveNewAccount(account);
    }

    private AccountBalance saveNewAccount(AccountBalance account) {
        try {
            return balanceRepository.saveAndFlush(account);
        } catch (DataIntegrityViolationException exception) {
            return balanceRepository.findByAccountKey(account.getAccountKey()).orElseThrow(() -> exception);
        }
    }

    private void apply(
            AccountBalance account,
            BigDecimal availableDelta,
            BigDecimal heldDelta,
            AccountTransactionType type,
            String referenceType,
            String referenceId,
            String idempotencyKey
    ) {
        BigDecimal availableAfter = money(account.getAvailableAmount().add(availableDelta));
        BigDecimal heldAfter = money(account.getHeldAmount().add(heldDelta));
        if (availableAfter.signum() < 0 || heldAfter.signum() < 0) {
            throw new InsufficientBalanceException("Account balance cannot become negative");
        }
        account.setAvailableAmount(availableAfter);
        account.setHeldAmount(heldAfter);

        AccountTransaction transaction = new AccountTransaction();
        transaction.setAccountBalance(account);
        transaction.setType(type);
        transaction.setAvailableDelta(money(availableDelta));
        transaction.setHeldDelta(money(heldDelta));
        transaction.setAvailableAfter(availableAfter);
        transaction.setHeldAfter(heldAfter);
        transaction.setReferenceType(referenceType);
        transaction.setReferenceId(referenceId);
        transaction.setIdempotencyKey(idempotencyKey);
        transactionRepository.save(transaction);
    }

    private static String userKey(User user) {
        return "USER:" + user.getId() + ":" + CURRENCY;
    }

    private static BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.UNNECESSARY);
    }

    private static void requirePositive(BigDecimal amount) {
        if (amount.signum() <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
    }
}
