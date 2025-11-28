export interface FormFieldOption {
  value: string;
  text?: string;
  translationKey?: string;
}

export interface FormFieldConfig {
  name: string;
  type: 'radio' | 'checkbox' | 'text' | 'date' | 'textarea' | 'character-count';
  required?: boolean;
  pattern?: string;
  maxLength?: number;
  errorMessage?: string;
  label?: string;
  hint?: string;
  translationKey?: {
    label?: string;
    hint?: string;
  };
  options?: FormFieldOption[];
  classes?: string;
  attributes?: Record<string, unknown>;
}
