declare module '@ministryofjustice/frontend' {
  interface MultiFileUploadConfig {
    uploadUrl?: string;
    deleteUrl?: string;
    uploadStatusText?: string;
    dropzoneHintText?: string;
    dropzoneButtonText?: string;
    feedbackContainer?: {
      selector?: string;
      element?: Element | null;
    };
    hooks?: {
      entryHook?: (upload: InstanceType<typeof MultiFileUpload>, file: File) => void;
      exitHook?: (upload: InstanceType<typeof MultiFileUpload>, file: File, xhr: XMLHttpRequest) => void;
      errorHook?: (upload: InstanceType<typeof MultiFileUpload>, file: File, xhr: XMLHttpRequest) => void;
      deleteHook?: (upload: InstanceType<typeof MultiFileUpload>, file: File | undefined, xhr: XMLHttpRequest) => void;
    };
  }

  class MultiFileUpload {
    constructor(root: Element | null, config?: MultiFileUploadConfig);
    static moduleName: string;
    static defaults: MultiFileUploadConfig;
    static isSupported(): boolean;
  }
}
