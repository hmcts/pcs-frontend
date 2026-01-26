import 'reflect-metadata';

import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PostcodeController } from '../../../../main/nest/postcode/postcode.controller';
import { PostcodeService } from '../../../../main/nest/postcode/postcode.service';

describe('PostcodeController', () => {
  let controller: PostcodeController;
  let postcodeService: { getAddressesByPostcode: jest.Mock };

  const mockAddresses = [
    {
      fullAddress: '1 HIGH STREET, LONDON, SW1A 1AA',
      addressLine1: '1 High Street',
      addressLine2: '',
      addressLine3: '',
      town: 'LONDON',
      county: '',
      postcode: 'SW1A 1AA',
      country: 'ENGLAND',
    },
  ];

  beforeEach(async () => {
    const mockService = {
      getAddressesByPostcode: jest.fn(),
    };

    const { OidcGuard } = await import('../../../../main/nest/guards/oidc.guard');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostcodeController],
      providers: [
        {
          provide: PostcodeService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(OidcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PostcodeController>(PostcodeController);
    postcodeService = mockService;
  });

  describe('lookup', () => {
    it('should return addresses for a valid postcode', async () => {
      postcodeService.getAddressesByPostcode.mockResolvedValue(mockAddresses);

      const result = await controller.lookup({ postcode: 'SW1A 1AA' });

      expect(result).toEqual({ addresses: mockAddresses });
      expect(postcodeService.getAddressesByPostcode).toHaveBeenCalledWith('SW1A 1AA');
    });

    it('should trim whitespace from postcode', async () => {
      postcodeService.getAddressesByPostcode.mockResolvedValue(mockAddresses);

      await controller.lookup({ postcode: '  SW1A 1AA  ' });

      expect(postcodeService.getAddressesByPostcode).toHaveBeenCalledWith('SW1A 1AA');
    });

    it('should throw BadRequestException when postcode is missing', async () => {
      await expect(controller.lookup({})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when postcode is empty', async () => {
      await expect(controller.lookup({ postcode: '' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when postcode is only whitespace', async () => {
      await expect(controller.lookup({ postcode: '   ' })).rejects.toThrow(BadRequestException);
    });

    it('should return empty addresses array when no results found', async () => {
      postcodeService.getAddressesByPostcode.mockResolvedValue([]);

      const result = await controller.lookup({ postcode: 'XX1 1XX' });

      expect(result).toEqual({ addresses: [] });
    });

    it('should propagate BadGatewayException from service', async () => {
      postcodeService.getAddressesByPostcode.mockRejectedValue(new BadGatewayException('Failed to lookup postcode'));

      await expect(controller.lookup({ postcode: 'SW1A 1AA' })).rejects.toThrow(BadGatewayException);
    });
  });
});
