import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';
import { getAddressesByPostcode } from '../services/osPostcodeLookupService';
import { getCourtVenues } from '../services/pcsApi/pcsApiService';

export default function (app: Application): void {
  app.get('/postcode', oidcMiddleware, async (req: Request, res: Response) => {
    res.render('postcode', { fields: {} });
  });

  app.post('/postcode', async (req: Request, res: Response) => {
    const logger = Logger.getLogger('postcode');

    const postcode = req.body.postcode?.trim();

    if (!postcode) {
      return res.render('postcode', {
        fields: {
          postcode: {
            value: '',
            errorMessage: 'Please enter a postcode',
          },
        },
      });
    }

    try {
      if (!req.session?.user?.accessToken) {
        throw new Error('Access token missing from session');
      }

      const courtData = await getCourtVenues(postcode, req.session?.user);
      const tableRows = courtData.map(court => [{ text: court.id.toString() }, { text: court.name }]);
      res.render('courts.njk', { tableRows });
    } catch (error) {
      logger.error('Failed to fetch court data', {
        error: error?.message || error,
        stack: error?.stack,
        postcode,
      });

      return res.render('postcode', {
        fields: {
          postcode: {
            value: postcode,
            errorMessage: 'There was an error retrieving court data. Please try again later.',
          },
        },
      });
    }
  });

  // Address lookup routes for journey integration
  app.post('/address-lookup', async (req: Request, res: Response): Promise<void> => {
    const logger = Logger.getLogger('addressLookup');
    const { postcode, searchString } = req.body;

    if (!postcode?.trim()) {
      res.json({
        success: false,
        error: 'Please enter a postcode',
      });
      return;
    }

    try {
      const addresses = await getAddressesByPostcode(postcode.trim());

      // Filter by search string if provided
      let filteredAddresses = addresses;
      if (searchString?.trim()) {
        const search = searchString.trim().toLowerCase();
        filteredAddresses = addresses.filter(
          addr =>
            addr.addressLine1.toLowerCase().includes(search) ||
            addr.addressLine2.toLowerCase().includes(search) ||
            addr.addressLine3.toLowerCase().includes(search)
        );
      }

      res.json({
        success: true,
        addresses: filteredAddresses,
        postcode: postcode.trim(),
        searchString: searchString?.trim() || '',
      });
    } catch (error) {
      logger.error('Failed to fetch addresses', {
        error: error?.message || error,
        stack: error?.stack,
        postcode,
      });

      res.json({
        success: false,
        error: 'There was an error retrieving addresses. Please try again later.',
      });
    }
  });

  // Route to handle address selection
  app.post('/address-select', async (req: Request, res: Response): Promise<void> => {
    const { selectedAddress } = req.body;

    if (!selectedAddress) {
      res.json({
        success: false,
        error: 'Please select an address',
      });
      return;
    }

    res.json({
      success: true,
      address: selectedAddress,
    });
  });
}
