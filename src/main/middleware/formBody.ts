import * as bodyParser from 'body-parser';
import type { RequestHandler } from 'express';

/*
 * Make an order, and a caseworker's review of one, post the whole order document, which outgrows the 100kb
 * default. A regex rather than the routes' constants so the caseReference param middleware does not run
 * before the modules are set up.
 */
const ORDER_DOCUMENT_PAGES = /^\/case\/\d{16}\/(?:make-order|confirm-order-review\/review)\/?$/i;

const orderDocumentForms = bodyParser.urlencoded({ extended: false, limit: '2mb' });
const forms = bodyParser.urlencoded({ extended: false });

/** Parses posted forms, allowing the pages that post an order document a larger body. */
export const formBodyMiddleware: RequestHandler = (req, res, next) =>
  (ORDER_DOCUMENT_PAGES.test(req.path) ? orderDocumentForms : forms)(req, res, next);
