/** Shared recognition thresholds (safe for client + server imports). */

/** Auto-accept embedding match when similarity ≥ this and gap to #2 is large enough */
export const EMBEDDING_AUTO_ACCEPT = 0.82;
export const EMBEDDING_AUTO_ACCEPT_GAP = 0.04;

/** Show candidate picker (skip Gemini) when top similarity ≥ this */
export const EMBEDDING_CANDIDATE_MIN = 0.68;

/** Pass embedding top-N as Gemini shortlist when ≥ this (else full collection) */
export const EMBEDDING_SHORTLIST_MIN = 0.55;
