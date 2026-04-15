declare module '@hmcts-cft/cft-ui-component-lib' {
  interface HeaderModel {
    assetsPath?: string;
    [key: string]: unknown;
  }

  export function buildHeaderModel(options: { xuiBaseUrl: string; user: { roles: string[] } }): HeaderModel;
  export function buildFooterModel(): unknown;
}
