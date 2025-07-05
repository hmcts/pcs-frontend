export interface FormFieldConfig {
  name: string;
  type: 'radio' | 'checkbox' | 'text';
  required?: boolean;
  pattern?: string;
  errorMessage?: string;
}
