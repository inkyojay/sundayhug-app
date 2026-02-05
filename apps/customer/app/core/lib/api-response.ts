/**
 * Shared API response types for actions and loaders
 */

/** Standard action result returned from React Router actions */
export type ActionResult<T = Record<string, unknown>> =
  | ({ success: true; message?: string } & T)
  | { success: false; error: string };
