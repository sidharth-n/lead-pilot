// src/utils/errors.ts

/**
 * Standard API error response format
 */
export interface ApiError {
  error: string;
  code: string;
  details?: string[];
}

/**
 * Create standardized error response
 */
export function createError(message: string, code: string, details?: string[]): ApiError {
  return {
    error: message,
    code,
    details: details?.length ? details : undefined,
  };
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // 400 Bad Request
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  
  // 404 Not Found
  NOT_FOUND: 'NOT_FOUND',
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  LEAD_NOT_FOUND: 'LEAD_NOT_FOUND',
  
  // 409 Conflict
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INVALID_STATE: 'INVALID_STATE',
  
  // 500 Internal Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

/**
 * Pre-built common errors
 */
export const CommonErrors = {
  contactNotFound: () => createError('Contact not found', ErrorCodes.CONTACT_NOT_FOUND),
  campaignNotFound: () => createError('Campaign not found', ErrorCodes.CAMPAIGN_NOT_FOUND),
  leadNotFound: () => createError('Lead not found', ErrorCodes.LEAD_NOT_FOUND),
  validationFailed: (details: string[]) => createError('Validation failed', ErrorCodes.VALIDATION_ERROR, details),
  alreadyExists: (resource: string) => createError(`${resource} already exists`, ErrorCodes.ALREADY_EXISTS),
  invalidState: (message: string) => createError(message, ErrorCodes.INVALID_STATE),
  internalError: () => createError('Internal server error', ErrorCodes.INTERNAL_ERROR),
};
