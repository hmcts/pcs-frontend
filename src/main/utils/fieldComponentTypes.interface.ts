export type RadioItems = {
  component: {
    items: {
      text: string;
      value?: string;
      checked: boolean;
    }[];
  };
};

export type SelectItems = {
  component: {
    items: {
      text: string;
      value?: string;
    }[];
  };
};
