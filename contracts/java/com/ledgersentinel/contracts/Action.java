package com.ledgersentinel.contracts;

import java.time.Duration;
import java.time.Instant;

/**
 * The internal domain model for an authorised action.
 *
 * <p>This is the type that makes the safety story real. Because the interface is
 * {@code sealed}, a {@code switch} over an {@code Action} that forgets a case
 * <strong>does not compile</strong>:
 *
 * <pre>{@code
 * String describe(Action a) {
 *     return switch (a) {                       // no default branch
 *         case Approve ignored  -> "proceeding";
 *         case Verify v         -> "challenge via " + v.channel();
 *         case CoolOff c        -> "delayed " + c.delay().toMinutes() + "m";
 *         case Hold h           -> "held until " + h.expiresAt();
 *         case Escalate e       -> "human decision: " + e.reason();
 *     };
 * }
 * }</pre>
 *
 * <p>Add a sixth rung to the ladder and every switch in the codebase fails the build until
 * somebody has decided what it means. That is the point - an unhandled risk state should
 * never be something you discover in production.
 *
 * <p>Only the policy gate constructs these. No model, prompt, or inference service may.
 */
public sealed interface Action {

    /** The wire representation, for serialisation and for the audit log. */
    ActionType type();

    /** Ids of the evidence and policy rules that justify this action. Never empty. */
    java.util.List<String> rationaleRefs();

    /** Low risk, high confidence, inside limits. */
    record Approve(java.util.List<String> rationaleRefs) implements Action {
        @Override
        public ActionType type() {
            return ActionType.APPROVE;
        }
    }

    /**
     * Step-up identity challenge.
     *
     * @param channel must be out-of-band - a channel the scammer is not already sitting on
     */
    record Verify(VerificationChannel channel, java.util.List<String> rationaleRefs)
            implements Action {
        @Override
        public ActionType type() {
            return ActionType.VERIFY;
        }
    }

    /** Timed delay. The countermeasure to manufactured urgency. */
    record CoolOff(Duration delay, java.util.List<String> rationaleRefs) implements Action {
        @Override
        public ActionType type() {
            return ActionType.COOL_OFF;
        }
    }

    /** Paused and queued for review. Time-boxed and reversible by design. */
    record Hold(Instant expiresAt, java.util.List<String> rationaleRefs) implements Action {
        @Override
        public ActionType type() {
            return ActionType.HOLD;
        }
    }

    /** Paused pending a named human decision. The system may never release this itself. */
    record Escalate(String reason, java.util.List<String> rationaleRefs) implements Action {
        @Override
        public ActionType type() {
            return ActionType.ESCALATE;
        }
    }

    /** Out-of-band channels for a step-up challenge. */
    enum VerificationChannel {
        APP_PUSH("app_push"),
        BRANCH_CALLBACK("branch_callback"),
        REGISTERED_EMAIL("registered_email"),
        IN_PERSON("in_person");

        private final String wire;

        VerificationChannel(String wire) {
            this.wire = wire;
        }

        public String wire() {
            return wire;
        }
    }
}
