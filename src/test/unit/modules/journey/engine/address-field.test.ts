import { StepConfig } from '../../../../../main/modules/journey/engine/schema';
import { JourneyValidator } from '../../../../../main/modules/journey/engine/validation';

describe('Address Field Validation', () => {
  const validator = new JourneyValidator();

  const createAddressStep = (): StepConfig => ({
    id: 'test-step',
    type: 'form',
    title: 'Test Address Step',
    fields: {
      address: {
        type: 'address',
        label: 'Your address',
        validate: {
          required: true,
          minLength: 0,
          maxLength: 100,
          min: 0,
          max: 100,
          customMessage: 'Please enter your address',
        },
      },
    },
  });

  describe('Valid address data', () => {
    it('should accept address from lookup', () => {
      const step = createAddressStep();
      const submission = {
        address: JSON.parse(
          JSON.stringify({
            addressLine1: '123 Test Street',
            town: 'Test Town',
            postcode: 'TE1 1ST',
            manualEntry: false,
          })
        ),
      };

      const result = validator.validate(step, submission);
      expect(result.success).toBe(true);
      expect(result.data?.address).toEqual({
        addressLine1: '123 Test Street',
        town: 'Test Town',
        postcode: 'TE1 1ST',
        manualEntry: false,
      });
    });

    it('should accept manually entered address', () => {
      const step = createAddressStep();
      const submission = {
        address: {
          addressLine1: '456 Manual Street',
          addressLine2: 'Apt 2',
          town: 'Manual Town',
          postcode: 'MA1 1NU',
          manualEntry: true,
        },
      };

      const result = validator.validate(step, submission);
      expect(result.success).toBe(true);
      expect(result.data?.address).toEqual({
        addressLine1: '456 Manual Street',
        addressLine2: 'Apt 2',
        town: 'Manual Town',
        postcode: 'MA1 1NU',
        manualEntry: true,
      });
    });
  });

  describe('Invalid address data', () => {
    it('should reject empty address when required', () => {
      const step = createAddressStep();
      const submission = {
        address: {},
      };

      const result = validator.validate(step, submission);
      expect(result.success).toBe(false);
      expect(result.errors?.address).toBe('Please enter your address');
    });

    it('should reject address with only empty fields', () => {
      const step = createAddressStep();
      const submission = {
        address: {
          addressLine1: '',
          town: '',
          postcode: '',
        },
      };

      const result = validator.validate(step, submission);
      expect(result.success).toBe(false);
      expect(result.errors?.address).toBe('Please enter your address');
    });
  });

  describe('Optional address field', () => {
    it('should accept empty address when not required', () => {
      const step: StepConfig = {
        id: 'test-step',
        type: 'form',
        title: 'Test Address Step',
        fields: {
          address: {
            type: 'address',
            label: 'Your address (optional)',
            validate: {
              required: false,
              minLength: 0,
              maxLength: 100,
              min: 0,
              max: 100,
            },
          },
        },
      };

      const submission = {
        address: {},
      };

      const result = validator.validate(step, submission);
      expect(result.success).toBe(true);
      expect(result.data?.address).toEqual({});
    });
  });
});
