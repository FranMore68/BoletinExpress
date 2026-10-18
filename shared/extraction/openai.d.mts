export function extractionRequest(type: string, text: string, image: string|null, locale?: string): {model: string; store: boolean; instructions: string; [key: string]: unknown};
export function sanitizeResult(type: string, value: unknown): {fields: {key: string; value: string|boolean; evidence: string; uncertain: boolean}[]; issues: string[]};
