// src/utils/validation.ts

/**
 * Email validation regex - RFC 5322 simplified
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false; // Max email length
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

/**
 * Validate positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Validate non-negative integer (allows 0)
 */
export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Sanitize string for safety (trim, limit length)
 */
export function sanitizeString(value: string | undefined | null, maxLength = 1000): string | null {
  if (!value || typeof value !== 'string') return null;
  return value.trim().slice(0, maxLength);
}

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate contact input
 */
export function validateContactInput(input: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }
  
  const data = input as Record<string, unknown>;
  
  // Email is required
  if (!data.email) {
    errors.push('email is required');
  } else if (typeof data.email !== 'string') {
    errors.push('email must be a string');
  } else if (!isValidEmail(data.email)) {
    errors.push('email format is invalid');
  }
  
  // Optional string fields
  const stringFields = ['first_name', 'last_name', 'company', 'job_title', 'location', 'linkedin_url'];
  for (const field of stringFields) {
    if (data[field] !== undefined && data[field] !== null && typeof data[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate campaign input
 */
export function validateCampaignInput(input: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }
  
  const data = input as Record<string, unknown>;
  
  // Required fields
  const requiredFields = ['name', 'from_name', 'from_email', 'subject_template', 'body_template'];
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`${field} is required`);
    } else if (typeof data[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  }
  
  // Validate from_email format
  if (data.from_email && typeof data.from_email === 'string' && !isValidEmail(data.from_email)) {
    errors.push('from_email format is invalid');
  }
  
  // follow_up_delay_minutes must be positive integer if provided
  if (data.follow_up_delay_minutes !== undefined) {
    if (!isNonNegativeInteger(data.follow_up_delay_minutes)) {
      errors.push('follow_up_delay_minutes must be a non-negative integer');
    }
  }
  
  // daily_limit must be positive if provided
  if (data.daily_limit !== undefined) {
    if (!isPositiveInteger(data.daily_limit)) {
      errors.push('daily_limit must be a positive integer');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate contact_ids array
 */
export function validateContactIds(input: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }
  
  const data = input as Record<string, unknown>;
  
  if (!data.contact_ids) {
    errors.push('contact_ids is required');
  } else if (!Array.isArray(data.contact_ids)) {
    errors.push('contact_ids must be an array');
  } else if (data.contact_ids.length === 0) {
    errors.push('contact_ids cannot be empty');
  } else {
    for (let i = 0; i < data.contact_ids.length; i++) {
      if (typeof data.contact_ids[i] !== 'string' || !data.contact_ids[i]) {
        errors.push(`contact_ids[${i}] must be a non-empty string`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}
