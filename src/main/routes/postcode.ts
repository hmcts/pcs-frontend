import axios from 'axios';
import config from 'config';
import { Application, Request, Response } from 'express';

export default function (app: Application): void {
  app.get('/postcode', (req: Request, res: Response) => {
    res.render('postcode', { fields: {} });
  });

  app.post('/postcode', async (req: Request, res: Response) => {
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
      const pcsApiURL = config.get('api.url');
      //  console.log('pcsApiURL ===> ', pcsApiURL);
      //  const response = await axios.get(`${pcsApiURL}/court?postCode=${encodeURIComponent(postcode)}`);
      const response = await axios.get(`${pcsApiURL}/health`);
      const courtData = response.data;

      // Render or handle the result however you need
      res.render('postcode-result', { courtData });
    } catch (error) {
      //   console.error('Error calling court API:', error);

      res.render('postcode', {
        fields: {
          postcode: {
            value: postcode,
            errorMessage: 'There was a problem retrieving court information.',
          },
        },
      });
    }
  });
}
