package com.ledgersentinel.contracts;

import java.time.Instant;
import java.util.List;

/**
 * A normalised, storable claim supporting or undermining a decision.
 *
 * <p>Note what this record cannot hold: a message body. Only a claim, a pointer back to the
 * source, and at most one short redacted quote. The corpus of someone's messages does not
 * exist in this system, and the type is shaped so it cannot accidentally start existing.
 *
 * @param critical evidence strong enough on its own to force the top of the ladder. Critical
 *                 evidence MUST be consumed before a decision can be proposed.
 */
public record Evidence(
        String evidenceId,
        SourceType sourceType,
        String sourceRef,
        String claim,
        double confidence,
        Instant timestamp,
        List<String> signalRefs,
        String redactedQuote,
        boolean critical) {

    public Evidence {
        if (evidenceId == null || !evidenceId.startsWith("ev_")) {
            throw new IllegalArgumentException(
                "evidenceId must look like ev_*, got " + evidenceId);
        }
        if (claim == null || claim.isBlank()) {
            throw new IllegalArgumentException(
                "claim is required - the LLM may interpret evidence but never invent it (rule 4)");
        }
        if (confidence < 0.0 || confidence > 1.0) {
            throw new IllegalArgumentException(
                "confidence must be in [0,1], got " + confidence);
        }
        signalRefs = signalRefs == null ? List.of() : List.copyOf(signalRefs);
    }

    /** Where a claim came from. {@code IDENTITY} covers KYC / identity-assurance findings. */
    public enum SourceType {
        COMMUNICATION("communication"),
        TRANSACTION("transaction"),
        ADVISORY("advisory"),
        IDENTITY("identity");

        private final String wire;

        SourceType(String wire) {
            this.wire = wire;
        }

        public String wire() {
            return wire;
        }
    }
}
