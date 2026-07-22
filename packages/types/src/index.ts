/**
 * @saf/types — shared contract layer for Smart Approval Flow.
 *
 * Import from here everywhere (API, web, db seed) so enums, the API envelope
 * and validation schemas stay consistent across the whole system.
 */
export * from './enums.js';
export * from './api.js';
export * from './schemas.js';
export * from './permissions.js';
export * from './plans.js';
