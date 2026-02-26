// Mock for glob to avoid ES module parsing issues in Jest
const globFn: any = jest.fn().mockResolvedValue([]);
globFn.sync = jest.fn().mockReturnValue([]);

export const glob = globFn;
