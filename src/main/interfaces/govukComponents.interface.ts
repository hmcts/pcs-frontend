export type SummaryListRow = {
  key: {
    text: string;
  };
  value: {
    text: string;
  };
  actions: {
    items: SummaryListRowAction[];
  };
};

export type SummaryListRowAction = {
  href: string;
  text: string;
  visuallyHiddenText: string;
};
