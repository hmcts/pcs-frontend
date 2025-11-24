export interface FormFieldOption {
  value: string;
  text?: string; // Direct text (overrides translationKey)
  translationKey?: string; // Translation key for the option text (e.g., 'options.rentArrears')
}

export interface FormFieldConfig {
  name: string;
  type: 'radio' | 'checkbox' | 'text' | 'date' | 'textarea';
  required?: boolean;
  pattern?: string;
  maxLength?: number; // Maximum character length (for text and textarea fields)
  errorMessage?: string;
  label?: string; // Direct label text (overrides translationKey.label)
  hint?: string; // Direct hint text (overrides translationKey.hint)
  translationKey?: {
    label?: string; // Translation key for label (e.g., 'question', 'title', 'firstNameLabel')
    hint?: string; // Translation key for hint (e.g., 'hint')
  };
  options?: FormFieldOption[]; // For radio and checkbox fields
  classes?: string; // For styling (e.g., input width)
  attributes?: Record<string, unknown>; // For additional HTML attributes (e.g., rows for textarea)
}
