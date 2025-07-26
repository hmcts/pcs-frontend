import { ActionRegistry } from '../utils/registry/action.registry';
import { ValidationRegistry } from '../utils/registry/validation.registry';

async function globalTeardownConfig(): Promise<void> {
  ActionRegistry.updateReadmeSection();
  ValidationRegistry.updateReadmeSection();
}

export default globalTeardownConfig;
