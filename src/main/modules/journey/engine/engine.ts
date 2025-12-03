import { Logger } from '@hmcts/nodejs-logging';
import express, { NextFunction, Request, Response, Router } from 'express';

import { oidcMiddleware } from '../../../middleware/oidc';

import { Handlers } from './handlers';
import { JourneyConfig, JourneyDraft, JourneySchema } from './schema';
import { type JourneyStore } from './storage/index';
import { TemplateUtils } from './templateUtils';
import { RequestWithStep } from './types';
import { JourneyValidator } from './validation';
import { DataProviderManager, type DataProviderConfig } from './dataProviders';

export class WizardEngine {
  public readonly journey: JourneyConfig;
  public readonly slug: string;
  public readonly basePath: string;
  private readonly validator: JourneyValidator;
  private static validatedJourneys: Map<string, JourneyConfig> = new Map();
  private readonly store!: JourneyStore;
  private readonly dataProviderManager: DataProviderManager;

  logger = Logger.getLogger('WizardEngine');

  constructor(journeyConfig: JourneyDraft, slug: string, sourcePath?: string) {
    // Disable caching when running unit tests so each instantiation can supply
    // its own journey configuration – tests often reuse the same slug with
    // different configs which would otherwise be ignored due to the cache.
    const cachingEnabled = process.env.NODE_ENV !== 'test';

    const cachedJourney = cachingEnabled ? WizardEngine.validatedJourneys.get(slug) : undefined;

    if (cachedJourney) {
      this.journey = cachedJourney;
    } else {
      // Validate the supplied TypeScript journey object
      const parseResult = JourneySchema.safeParse(journeyConfig);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        const loc = issue.path.join('.') || '(root)';
        const fileInfo = sourcePath ? ` in file ${sourcePath}` : '';
        const detailedMsg = `Invalid journey configuration${fileInfo} (slug "${slug}", path "${loc}"): ${issue.message}`;
        this.logger.error(detailedMsg, parseResult.error.issues);
        throw new Error(detailedMsg);
      }

      this.journey = parseResult.data;

      // Only cache when enabled (i.e. not in test mode)
      if (cachingEnabled) {
        WizardEngine.validatedJourneys.set(slug, this.journey);
      }
    }

    this.slug = slug;
    this.basePath = `/${slug}`;
    this.validator = new JourneyValidator();
    const storeType = this.journey.config?.store?.type ?? 'session';
    this.store = this.setStore(storeType);

    // Initialize data provider manager if configured
    const dataProviderConfig = this.journey.config?.dataProviders as DataProviderConfig | undefined;
    this.dataProviderManager = new DataProviderManager(dataProviderConfig, this.logger);
  }

  private setStore(storeType: string) {
    const storeModule = require(`./storage/${storeType}Store`);
    const factoryName = `${storeType}Store`;
    const storeFactory = (storeModule[factoryName] ?? storeModule.default) as (slug: string) => JourneyStore;
    if (!storeFactory) {
      throw new Error(`Store implementation for type "${this.journey.config?.store?.type}" not found`);
    }
    return storeFactory(this.slug);
  }

  router(): Router {
    const router = Router();

    // Per-request language & namespace setup for this journey
    router.use(async (req, res, next) => {
      const ns = this.journey.config?.i18nNamespace ?? this.slug;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lang = (req as any).language || 'en';

      try {
        // Ensure the namespace is loaded before use
        if (req.i18n) {
          await new Promise<void>((resolve, reject) => {
            req.i18n.loadNamespaces(ns, err => (err ? reject(err) : resolve()));
          });

          // Set default namespace (helps with bare-key lookups)
          req.i18n.setDefaultNamespace(ns);
        }

        // Translator bound to current lang + ns
        const fixedT = req.i18n?.getFixedT?.(lang, ns) ?? (req.t as typeof req.t); // fallback to plain req.t

        // Expose to locals (used in Nunjucks and templates)
        res.locals.lang = lang;
        res.locals.ns = ns;
        res.locals.t = fixedT;
        res.locals.journey = this.journey;
        res.locals.slug = this.slug;

        // Update Nunjucks globals too
        const env = req.app.locals?.nunjucksEnv;
        if (env) {
          env.addGlobal('lang', lang);
          env.addGlobal('ns', ns);
          env.addGlobal('t', fixedT);
        }

        this.logger.info(`[journey i18n] lang=${lang}, ns=${ns}`);
      } catch (e) {
        this.logger.warn(`[journey i18n] failed to set up namespace "${ns}"`, e);
      }

      next();
    });

    // Apply authentication middleware if required
    if (this.journey.config?.auth?.required !== false) {
      router.use(oidcMiddleware);
    }

    // Create handlers instance
    const handlers = new Handlers({
      journey: this.journey,
      slug: this.slug,
      basePath: this.basePath,
      store: this.store,
      validator: this.validator,
      logger: this.logger,
      dataProviderManager: this.dataProviderManager,
    });

    // Add route to start a new journey (creates caseId in the session and redirects to first step)
    router.get('/', (req, res) => {
      handlers.getOrCreateCaseId(req);
      const lang = (res.locals.lang as string) || 'en';
      const firstStepId = Object.keys(this.journey.steps)[0];
      const validatedFirstStepId = TemplateUtils.validateStepIdForRedirect(firstStepId, this.journey);
      if (validatedFirstStepId) {
        res.redirect(`${this.basePath}/${encodeURIComponent(validatedFirstStepId)}?lang=${encodeURIComponent(lang)}`);
      } else {
        this.logger.error('Critical error: No valid step IDs found in journey configuration');
        res.status(500).send('Internal server error');
      }
    });

    router.param('step', (req: Request, res: Response, next: NextFunction, stepId: string) => {
      const step = this.journey.steps[stepId];
      if (!step) {
        return res.status(404).render('not-found');
      }
      (req as RequestWithStep).step = { id: stepId, ...step };
      next();
    });

    // ─── GET ───
    router.get('/:step', (req, res, next) => {
      handlers.handleGet(req, res, next);
    });

    // ─── POST ───
    router.post('/:step', express.urlencoded({ extended: true }), (req, res, next) => {
      handlers.handlePost(req, res, next);
    });

    return router;
  }
}
