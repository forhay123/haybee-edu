// ============================================================
// FILE 4: utils.ts (ADD formatDate)
// Location: frontend/src/lib/utils.ts
// ============================================================

/**
 * Simple class name merger utility
 */
export function cn(...classes: (string | undefined | null | false | 0)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ✅ ADD formatDate function
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
}

export default cn;

