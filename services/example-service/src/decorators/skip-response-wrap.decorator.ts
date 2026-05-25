import { SetMetadata } from "@nestjs/common";

export const SKIP_RESPONSE_WRAP_KEY = "skipResponseWrap";

/** Return raw body (e.g. proxy passthrough) without FE success envelope. */
export const SkipResponseWrap = () => SetMetadata(SKIP_RESPONSE_WRAP_KEY, true);
