export type FormRequiredPredicate = (
  formData: Record<string, unknown>,
  allFormData: Record<string, unknown>
) => boolean;

export type FieldValidator = (
  value: unknown,
  formData: Record<string, unknown>,
  allFormData: Record<string, unknown>
) => string | { text: string; anchor?: string } | undefined;

export interface FormFieldConfig {
  name: string;
  type: 'radio' | 'checkbox' | 'text';
  required?: boolean | FormRequiredPredicate;
  pattern?: string | RegExp;
  errorMessage?: string;
  anchor?: string;
  validator?: FieldValidator;
}
