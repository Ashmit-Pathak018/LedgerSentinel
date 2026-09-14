package com.ledgersentinel.contracts;

import java.util.List;

/**
 * One scam-intent indicator extracted from a single communication.
 *
 * <p>A Signal describes evidence. It carries no action, no recommendation, and no decision -
 * deliberately, there is nowhere in this record to put one. That is rule 1 expressed as a type.
 *
 * @param signalType    which of the eight frozen labels
 * @param value         raw pre-calibration score; debugging only, never drive logic off this
 * @param confidence    CALIBRATED probability, post Platt scaling - this is the one you use
 * @param sourceRef     id of the communication, e.g. {@code comm_771}
 * @param evidenceSpan  [start, end) offsets into the REDACTED text, or null
 * @param redactedQuote at most one short justifying phrase, already redacted, or null
 * @param modelVersion  e.g. {@code gemma3n-e4b@2026-09-14}
 */
public record Signal(
        SignalType signalType,
        double value,
        double confidence,
        String sourceRef,
        List<Integer> evidenceSpan,
        String redactedQuote,
        String modelVersion) {

    public Signal {
        if (confidence < 0.0 || confidence > 1.0) {
            throw new IllegalArgumentException(
                "confidence must be in [0,1], got " + confidence);
        }
        if (value < 0.0 || value > 1.0) {
            throw new IllegalArgumentException("value must be in [0,1], got " + value);
        }
        if (sourceRef == null || sourceRef.isBlank()) {
            throw new IllegalArgumentException(
                "sourceRef is required - evidence without provenance is a bug (rule 4)");
        }
        if (redactedQuote != null && redactedQuote.length() > 200) {
            throw new IllegalArgumentException(
                "redactedQuote is capped at 200 chars - we store a quote, never a message body");
        }
        evidenceSpan = evidenceSpan == null ? null : List.copyOf(evidenceSpan);
    }
}
