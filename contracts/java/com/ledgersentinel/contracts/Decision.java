package com.ledgersentinel.contracts;

import java.time.Instant;
import java.util.List;

/**
 * The authorised outcome, and the only thing in the system that says what actually happens.
 *
 * <p><strong>Only the deterministic policy gate constructs a Decision.</strong> No model,
 * prompt, or inference service may - that is rule 1, and it is the premise the whole product
 * rests on.
 *
 * <p>Every Decision is reproducible: given the same {@link Assessment} and the same
 * {@code policyVersion}, the gate returns the same action. That reproducibility is what makes
 * the PRISM V1 vs V2 comparison meaningful.
 *
 * @param action           the rung of the ladder
 * @param humanRequired    must be true whenever action is ESCALATE
 * @param rationaleRefs    ev_* and rule.* ids; empty means a decision nobody can explain
 * @param traceId          PRISM trace. Required on every decision, no exceptions (rule 8)
 * @param proposalRejected the gate overrode what the AI proposed - the most interesting rows
 *                         in the audit log, because they are the bounded-autonomy story
 */
public record Decision(
        String decisionId,
        String transactionId,
        String assessmentId,
        ActionType action,
        boolean humanRequired,
        String policyVersion,
        List<String> rationaleRefs,
        String traceId,
        boolean proposalRejected,
        Integer coolOffSeconds,
        Instant holdExpiresAt,
        Action.VerificationChannel verificationChannel,
        Instant createdAt) {

    public Decision {
        if (decisionId == null || !decisionId.startsWith("dec_")) {
            throw new IllegalArgumentException(
                "decisionId must look like dec_*, got " + decisionId);
        }
        if (rationaleRefs == null || rationaleRefs.isEmpty()) {
            throw new IllegalArgumentException(
                "rationaleRefs must not be empty - every decision must be explainable (rule 4)");
        }
        if (policyVersion == null || policyVersion.isBlank()) {
            throw new IllegalArgumentException("policyVersion is required (rule 8)");
        }
        if (traceId == null || traceId.isBlank()) {
            throw new IllegalArgumentException("traceId is required on every decision (rule 8)");
        }
        if (action == ActionType.ESCALATE && !humanRequired) {
            throw new IllegalArgumentException(
                "ESCALATE requires humanRequired=true - high-impact uncertainty always reaches "
                + "a person (rule 5)");
        }
        if (action == ActionType.COOL_OFF && coolOffSeconds == null) {
            throw new IllegalArgumentException("COOL_OFF requires coolOffSeconds");
        }
        if (action == ActionType.VERIFY && verificationChannel == null) {
            throw new IllegalArgumentException(
                "VERIFY requires an out-of-band verificationChannel");
        }
        rationaleRefs = List.copyOf(rationaleRefs);
    }
}
