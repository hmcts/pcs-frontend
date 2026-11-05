// eslint-disable-next-line import/order
import { EvictionOutcome, EvictionSuccessfulReturnName, WarrantReturnType } from '@utils/warrantReturn';

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    startCaseEvent: jest.fn().mockReturnValue({
      data: {
        claimantType: {
          value: {
            label: 'Claimant Type',
          },
        },
        allDefendants: [],
      },
    }),
  },
}));
import { Application } from 'express';

import recordWarrantReturnRoutes from '@routes/recordWarrantReturn';
import { ccdCaseService } from '@services/ccdCaseService';

type RouteHandler = (req: Request, res: Response, next: jest.Mock) => Promise<void> | void;

describe('recordWarrantReturnRoutes', () => {
  let app: Application;

  const getHandler = (path: string): RouteHandler => {
    const call = (app.get as jest.Mock).mock.calls.find(([routePath]) => routePath === path);

    if (!call) {
      throw new Error(`No handler registered for ${path}`);
    }

    return call[2] as RouteHandler;
  };

  const postHandler = (path: string): RouteHandler => {
    const call = (app.post as jest.Mock).mock.calls.find(([routePath]) => routePath === path);

    if (!call) {
      throw new Error(`No handler registered for ${path}`);
    }

    return call[2] as RouteHandler;
  };

  beforeEach(() => {
    app = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as Application;

    recordWarrantReturnRoutes(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Route registration', () => {
    it('registers warrant return GET route', () => {
      expect(app.get).toHaveBeenCalledWith(
        '/case/:caseReference/record-warrant-return',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('registers warrant return POST route', () => {
      expect(app.post).toHaveBeenCalledWith(
        '/case/:caseReference/record-warrant-return',
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('GET warrantReturn', () => {
    const mockStartCaseEvent = ccdCaseService.startCaseEvent as jest.Mock;

    it('renders the warrant return page', async () => {
      const handler = getHandler('/case/:caseReference/record-warrant-return');

      const res = {
        render: jest.fn(),
      };

      await handler(
        {
          params: {
            caseReference: '123',
          },
          session: {
            user: {
              accessToken: 'token',
            },
          },
        } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(mockStartCaseEvent).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        'record-warrant-return/warrant-return',
        expect.objectContaining({
          evictionData: expect.any(Object),
        })
      );
    });
  });

  describe('POST warrantReturn', () => {
    it('renders validation errors when no return type is supplied', async () => {
      const handler = postHandler('/case/:caseReference/record-warrant-return');

      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
      };

      await handler(
        {
          params: {
            caseReference: '123',
          },
          body: {},
        } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.render).toHaveBeenCalled();
    });

    it('redirects to check your answers for a valid final return', async () => {
      const res = {
        redirect: jest.fn(),
      };

      const req = {
        params: {
          caseReference: '123',
        },
        query: {
          finalOutcome: EvictionOutcome.SUCCESSFUL,
        },
        body: {
          returnType: WarrantReturnType.FINAL,
          evictionSuccessfulReturnName: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
        },
        session: {},
      };

      const handler = postHandler('/case/:caseReference/record-warrant-return');

      await handler(req as unknown as Request, res as unknown as Response, jest.fn());

      expect(res.redirect).toHaveBeenCalled();
    });
  });
});
