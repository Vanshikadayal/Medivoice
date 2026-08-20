const MEDICINE_INTENT_PREFIX =
  /^(?:what is|what are|tell me about|can you (?:tell|explain)|explain|describe|information (?:on|about)|info (?:on|about)|uses? of|side effects? of|composition of|ingredients? (?:in|of)|price of|cost of|substitute(?:s)? for|alternative(?:s)? (?:to|for)|how (?:does|do) .+ work|is .+ safe|compare .+ (?:with|and))\s+/i;

const GENERAL_HEALTH_PREFIX =
  /^(?:how (?:can|do|to)|what (?:can|should)|why (?:do|does)|when (?:should|to)|tips for|ways to|home remedies for|how to (?:reduce|treat|prevent|manage|improve|lower|increase))\b/i;

const MEDICINE_FORM_PATTERN =
  /\b(?:tablet|capsule|syrup|injection|ointment|cream|suspension|drops|gel|spray)s?\b/i;

const MEDICINE_STRENGTH_PATTERN =
  /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/i;

const BRAND_WITH_NUMBER_PATTERN =
  /\b[a-z][\w-]*\s+\d+(?:\.\d+)?\b/i;

export function isMedicineQuery(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) {
    return false;
  }

  const hasMedicineIndicator =
    MEDICINE_FORM_PATTERN.test(normalized) ||
    MEDICINE_STRENGTH_PATTERN.test(normalized) ||
    BRAND_WITH_NUMBER_PATTERN.test(normalized);

  if (
    GENERAL_HEALTH_PREFIX.test(normalized) &&
    !hasMedicineIndicator &&
    !MEDICINE_INTENT_PREFIX.test(normalized)
  ) {
    return false;
  }

  if (MEDICINE_INTENT_PREFIX.test(normalized)) {
    return true;
  }

  if (hasMedicineIndicator) {
    return true;
  }

  const compactQuery = normalized.replace(/[?!.]+$/g, '').trim();
  if (
    compactQuery.length >= 2 &&
    compactQuery.length <= 80 &&
    BRAND_WITH_NUMBER_PATTERN.test(compactQuery)
  ) {
    return true;
  }

  return false;
}
