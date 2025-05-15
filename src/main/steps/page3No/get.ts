import { GetController } from '../../app/controller/GetController';
import { generateContent } from './content';

export default class Page3NoGetController extends GetController {
  constructor(view: string) {
    super(view, generateContent);
  }
}
