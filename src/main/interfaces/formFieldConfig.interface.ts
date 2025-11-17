export interface FormFieldOption {
  value: string;
  text: string;
  hint?: string;
}

export interface FormFieldConfig {
  name: string;
  type: 'radio' | 'checkbox' | 'text' | 'select' | 'date' | 'textarea';
  required?: boolean | ((formData: Record<string, unknown>, allData: Record<string, unknown>) => boolean);
  pattern?: string;
  errorMessage?: string;
  options?: FormFieldOption[];
}
