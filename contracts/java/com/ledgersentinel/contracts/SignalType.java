package com.ledgersentinel.contracts;

/**
 * The eight frozen scam-intent labels.
 *
 * <p>Adding a ninth is a contract change: agree it with all three owners, update
 * contracts/json/signal.schema.json and contracts/ts/contracts.ts in the same commit,
 * and bump CONTRACTS_VERSION.
 */
public enum SignalType {
    URGENCY("urgency", "Time pressure"),
    AUTHORITY_IMPERSONATION("authority_impersonation", "Impersonating authority"),
    SECRECY_REQUEST("secrecy_request", "Asked to keep it secret"),
    REMOTE_ACCESS_REQUEST("remote_access_request", "Remote access requested"),
    PAYMENT_REDIRECT("payment_redirect", "Payment redirected"),
    OTP_REQUEST("otp_request", "OTP requested"),
    THREAT("threat", "Threat or intimidation"),
    INVESTMENT_LURE("investment_lure", "Investment lure");

    private final String wire;
    private final String label;

    SignalType(String wire, String label) {
        this.wire = wire;
        this.label = label;
    }

    /** The value as it appears in JSON. */
    public String wire() {
        return wire;
    }

    /** Human-readable. Never show a raw enum name to an analyst. */
    public String label() {
        return label;
    }

    public static SignalType fromWire(String s) {
        for (SignalType t : values()) {
            if (t.wire.equals(s)) {
                return t;
            }
        }
        throw new IllegalArgumentException(
            "Unknown signal_type '" + s + "'. The taxonomy is frozen at eight labels; "
            + "if the model service is emitting something else, that is a contract violation.");
    }
}
