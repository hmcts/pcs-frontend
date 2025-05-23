export interface FormFieldConfig {
  name: string;
  type: 'radio' | 'checkbox' | 'text';
  required?: boolean;
  errorMessage?: string;
}
