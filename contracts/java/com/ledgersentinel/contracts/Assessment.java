package com.ledgersentinel.contracts;

import java.time.Instant;
import java.util.List;

/**
 * The output of evidence fusion, and the input the policy gate reasons over.
 *
 * <p>{@code riskScore} and {@code confidence} are two separate values that mean two different
 * things: risk is <em>how bad this looks</em>, confidence is <em>how sure we are</em>. They are
 * never combined into a single number. Low confidence moves you up the ladder; it does not
 * change risk.
 *
 * <p>An Assessment is not a decision. It has no action field, by design.
 *
 * @param riskScore  0-100, how dangerous this transaction looks
 * @param confidence 0-1, how sure the system is of its own assessment
 * @param factors    short machine-readable reasons; an empty list is a bug (rule 4)
 * @param degraded   a component failed - must lower confidence, can never yield APPROVE (rule 5)
 */
public record Assessment(
        String assessmentId,
        String transactionId,
        int riskScore,
        double confidence,
        List<String> factors,
        List<String> evidenceIds,
        IdentityAssurance identityAssurance,
        boolean criticalEvidencePresent,
        boolean degraded,
        String modelVersion,
        Instant createdAt) {

    public Assessment {
        if (riskScore < 0 || riskScore > 100) {
            throw new IllegalArgumentException("riskScore must be in [0,100], got " + riskScore);
        }
        if (confidence < 0.0 || confidence > 1.0) {
            throw new IllegalArgumentException("confidence must be in [0,1], got " + confidence);
        }
        if (factors == null || factors.isEmpty()) {
            throw new IllegalArgumentException(
                "factors must not be empty - never show a risk score without the reasons behind it");
        }
        factors = List.copyOf(factors);
        evidenceIds = evidenceIds == null ? List.of() : List.copyOf(evidenceIds);
    }

    /**
     * Customer identity-assurance level. Feeds confidence, never risk: a weakly verified
     * customer does not make a transaction more dangerous, it makes us less sure about it.
     */
    public enum IdentityAssurance {
        NONE(0.60),
        BASIC(0.80),
        VERIFIED(1.00),
        STRONG(1.00);

        private final double confidenceMultiplier;

        IdentityAssurance(double confidenceMultiplier) {
            this.confidenceMultiplier = confidenceMultiplier;
        }

        /** Applied during fusion. Illustrative values - tune them in config, not in prompts. */
        public double confidenceMultiplier() {
            return confidenceMultiplier;
        }
    }
}
