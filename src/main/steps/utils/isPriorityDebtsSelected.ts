import type { Request } from 'express';

/**
 * Checks if the user just answered 'yes' to the priority-debts question.
 *
 * Reads the current form submission (req.body) for the havePriorityDebts field.
 */
export const isPriorityDebtsSelected = (req: Request): boolean => {
  return req.body?.havePriorityDebts === 'yes';
};
