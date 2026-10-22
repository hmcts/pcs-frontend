import * as bodyParser from 'body-parser';
import type { RequestHandler } from 'express';

/*
 * Make an order, and a caseworker's review of one, post the whole order document, which outgrows the 100kb
 * default. A regex rather than the routes' constants so the caseReference param middleware does not run
 * before the modules are set up.
 */
const ORDER_DOCUMENT_PAGES = /^\/case\/\d{16}\/(?:make-order|confirm-order-review\/review)\/?$/i;

const orderDocumentJson = bodyParser.json({ limit: '2mb' });
const json = bodyParser.json();
const orderDocumentForms = bodyParser.urlencoded({ extended: false, limit: '2mb' });
const forms = bodyParser.urlencoded({ extended: false });

/** Parses JSON and forms, keeping the larger body limit local to order document pages. */
export const formBodyMiddleware: RequestHandler = (req, res, next) => {
  const documentPage = ORDER_DOCUMENT_PAGES.test(req.path);
  if (req.is('application/json')) {
    return (documentPage ? orderDocumentJson : json)(req, res, next);
  }
  (documentPage ? orderDocumentForms : forms)(req, res, next);
};
