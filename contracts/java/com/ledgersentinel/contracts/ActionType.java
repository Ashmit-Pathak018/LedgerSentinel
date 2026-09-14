package com.ledgersentinel.contracts;

/**
 * The action ladder, declared in DESCENDING order of AI autonomy.
 *
 * <p>This is the wire format - a plain string on the JSON boundary. The internal domain
 * model is {@link Action}, a sealed interface that carries each action's own data and
 * gives you exhaustiveness checking at compile time.
 *
 * <p>{@code HOLD} and {@code ESCALATE} both pause the transaction. The difference is who
 * may release it: an analyst can release a HOLD, whereas an ESCALATE requires a named
 * human decision and the system may never release it on its own.
 */
public enum ActionType {
    /** Low risk, high confidence, inside limits. The AI acts alone. */
    APPROVE(0),
    /** Step-up identity challenge on an out-of-band channel. */
    VERIFY(1),
    /** Timed delay. Friction the scammer cannot wait out. */
    COOL_OFF(2),
    /** Paused, queued for review. An analyst can release it. */
    HOLD(3),
    /** Paused. A named human must decide. The AI may never release it. */
    ESCALATE(4);

    private final int severity;

    ActionType(int severity) {
        this.severity = severity;
    }

    /** 0 (APPROVE) to 4 (ESCALATE). Higher means less AI autonomy. */
    public int severity() {
        return severity;
    }

    /** True when this action requires a person before anything moves. */
    public boolean requiresHuman() {
        return this == ESCALATE;
    }

    /** True when the transaction does not proceed as submitted. */
    public boolean pausesTransaction() {
        return severity >= COOL_OFF.severity;
    }

    /**
     * The more restrictive of two actions.
     *
     * <p>Use this when combining rules: the ladder only ever ratchets upward, so a system
     * that is uncertain can never end up with more autonomy than one that is certain.
     */
    public static ActionType mostRestrictive(ActionType a, ActionType b) {
        return a.severity >= b.severity ? a : b;
    }
}
