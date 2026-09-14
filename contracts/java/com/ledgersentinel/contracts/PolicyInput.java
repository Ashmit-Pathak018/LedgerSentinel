package com.ledgersentinel.contracts;

/**
 * Everything the deterministic policy gate is allowed to look at.
 *
 * <p>This record is deliberately small. The gate must be a pure function of these fields -
 * no database reads, no model calls, no clock beyond what is passed in - so that the same
 * input always produces the same action and the whole thing is trivially unit-testable.
 *
 * <p>If you find yourself wanting to add a field here, ask whether the gate really needs it
 * or whether it belongs in fusion. The smaller this stays, the more defensible the gate is.
 *
 * @param riskScore        0-100 from the Assessment
 * @param confidence       0-1 from the Assessment, already adjusted for identity assurance
 * @param criticalEvidence any consumed evidence marked critical
 * @param highImpact       amount or counterparty crosses the high-impact threshold
 * @param timePressure     urgency or threat signals present - the COOL_OFF trigger
 * @param degraded         a component failed; per rule 5 this can never yield APPROVE
 * @param identityAssurance customer verification level at assessment time
 */
public record PolicyInput(
        int riskScore,
        double confidence,
        boolean criticalEvidence,
        boolean highImpact,
        boolean timePressure,
        boolean degraded,
        Assessment.IdentityAssurance identityAssurance) {

    public PolicyInput {
        if (riskScore < 0 || riskScore > 100) {
            throw new IllegalArgumentException("riskScore must be in [0,100], got " + riskScore);
        }
        if (confidence < 0.0 || confidence > 1.0) {
            throw new IllegalArgumentException("confidence must be in [0,1], got " + confidence);
        }
    }

    /** Build from an Assessment plus the transaction-level facts fusion worked out. */
    public static PolicyInput from(
            Assessment a, boolean highImpact, boolean timePressure) {
        return new PolicyInput(
                a.riskScore(),
                a.confidence(),
                a.criticalEvidencePresent(),
                highImpact,
                timePressure,
                a.degraded(),
                a.identityAssurance());
    }
}
