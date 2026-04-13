import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../../../main/interfaces/formFieldConfig.interface';

import * as fileUpload from '@modules/steps/formBuilder/fileUpload';
import { handleFileUploadDelete, validateAndAppendFileUploads } from '@modules/steps/formBuilder/fileUploadPostActions';
import * as helpers from '@modules/steps/formBuilder/helpers';

jest.mock('@modules/steps/formBuilder/fileUpload');
jest.mock('@modules/steps/formBuilder/helpers');

describe('fileUploadPostActions', () => {
  let mockT: TFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-expect-error - TFunction brand property not needed for test mock
    mockT = jest.fn((key: string, fallback?: string) => fallback || key);
  });

  describe('handleFileUploadDelete', () => {
    it('should delete file from saved files', () => {
      const savedFiles = [
        { id: 'file1', file_name: 'test1.pdf', content_type: 'application/pdf', size: 1024, url: '' },
        { id: 'file2', file_name: 'test2.pdf', content_type: 'application/pdf', size: 2048, url: '' },
      ];

      jest.spyOn(fileUpload, 'getSavedUploadFiles').mockReturnValue(savedFiles);
      const setSpy = jest.spyOn(fileUpload, 'setSavedUploadFiles');

      const req = {} as Request;
      const fields: FormFieldConfig[] = [{ name: 'myFile', type: 'file' }];

      handleFileUploadDelete(req, 'myStep', fields, 'file1');

      expect(setSpy).toHaveBeenCalledWith(req, 'myStep', 'myFile', [savedFiles[1]]);
    });

    it('should not modify files if deleteId not found', () => {
      const savedFiles = [
        { id: 'file1', file_name: 'test1.pdf', content_type: 'application/pdf', size: 1024, url: '' },
      ];

      jest.spyOn(fileUpload, 'getSavedUploadFiles').mockReturnValue(savedFiles);
      const setSpy = jest.spyOn(fileUpload, 'setSavedUploadFiles');

      const req = {} as Request;
      const fields: FormFieldConfig[] = [{ name: 'myFile', type: 'file' }];

      handleFileUploadDelete(req, 'myStep', fields, 'nonexistent');

      expect(setSpy).not.toHaveBeenCalled();
    });

    it('should skip non-file fields', () => {
      const getSpy = jest.spyOn(fileUpload, 'getSavedUploadFiles');

      const req = {} as Request;
      const fields: FormFieldConfig[] = [
        { name: 'textField', type: 'text' },
        { name: 'myFile', type: 'file' },
      ];

      handleFileUploadDelete(req, 'myStep', fields, 'file1');

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(req, 'myStep', 'myFile');
    });
  });

  describe('validateAndAppendFileUploads', () => {
    it('should return empty errors for no file fields', () => {
      const req = {} as Request;
      const fields: FormFieldConfig[] = [{ name: 'textField', type: 'text' }];

      const errors = validateAndAppendFileUploads(req, 'myStep', fields, mockT);

      expect(errors).toEqual({});
    });

    it('should return error when no file selected', () => {
      jest.spyOn(helpers, 'getMulterFilesForField').mockReturnValue([]);

      const req = {} as Request;
      const fields: FormFieldConfig[] = [{ name: 'myFile', type: 'file' }];

      const errors = validateAndAppendFileUploads(req, 'myStep', fields, mockT);

      expect(errors.myFile).toBe('Select a file');
      expect(mockT).toHaveBeenCalledWith('errors.fileUpload.selectFile', 'Select a file');
    });

    it('should use custom translation for selectFile error', () => {
      jest.spyOn(helpers, 'getMulterFilesForField').mockReturnValue([]);

      const req = {} as Request;
      const fields: FormFieldConfig[] = [{ name: 'myFile', type: 'file' }];
      const translations = { 'myFile.selectFile': 'Custom select file message' };

      const errors = validateAndAppendFileUploads(req, 'myStep', fields, mockT, translations);

      expect(errors.myFile).toBe('Custom select file message');
    });

    it('should return error for invalid file type', () => {
      const multerFile = {
        originalname: 'test.exe',
        mimetype: 'application/x-msdownload',
        size: 1024,
      } as Express.Multer.File;

      jest.spyOn(helpers, 'getMulterFilesForField').mockReturnValue([multerFile]);
      jest.spyOn(fileUpload, 'isAllowedUploadFilename').mockReturnValue(false);

      const req = {} as Request;
      const fields: FormFieldConfig[] = [{ name: 'myFile', type: 'file' }];

      const errors = validateAndAppendFileUploads(req, 'myStep', fields, mockT);

      expect(errors.myFile).toBeTruthy();
      expect(mockT).toHaveBeenCalledWith('errors.fileUpload.invalidFileType', expect.any(String));
    });

    it('should return error for file too large', () => {
      const multerFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 200 * 1024 * 1024, // 200MB
      } as Express.Multer.File;

      jest.spyOn(helpers, 'getMulterFilesForField').mockReturnValue([multerFile]);
      jest.spyOn(fileUpload, 'isAllowedUploadFilename').mockReturnValue(true);
      jest.spyOn(fileUpload, 'isFileTooLarge').mockReturnValue(true);

      const req = {} as Request;
      const fields: FormFieldConfig[] = [{ name: 'myFile', type: 'file' }];

      const errors = validateAndAppendFileUploads(req, 'myStep', fields, mockT);

      expect(errors.myFile).toBeTruthy();
      expect(mockT).toHaveBeenCalledWith('errors.fileUpload.fileTooLarge', expect.any(String));
    });

    it('should return error for single-only constraint violation', () => {
      const multerFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const savedFiles = [
        { id: 'existing', file_name: 'existing.pdf', content_type: 'application/pdf', size: 1024, url: '' },
      ];

      jest.spyOn(helpers, 'getMulterFilesForField').mockReturnValue([multerFile]);
      jest.spyOn(fileUpload, 'isAllowedUploadFilename').mockReturnValue(true);
      jest.spyOn(fileUpload, 'isFileTooLarge').mockReturnValue(false);
      jest.spyOn(fileUpload, 'getSavedUploadFiles').mockReturnValue(savedFiles);

      const req = {} as Request;
      const fields: FormFieldConfig[] = [{ name: 'myFile', type: 'file', fileUploadSingleOnly: true }];

      const errors = validateAndAppendFileUploads(req, 'myStep', fields, mockT);

      expect(errors.myFile).toBeTruthy();
      expect(mockT).toHaveBeenCalledWith('errors.fileUpload.singleFileOnly', 'You can only upload one file');
    });

    it('should save valid files to session', () => {
      const multerFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const newMeta = {
        id: 'new-id',
        file_name: 'test.pdf',
        content_type: 'application/pdf',
        size: 1024,
        url: '',
      };

      jest.spyOn(helpers, 'getMulterFilesForField').mockReturnValue([multerFile]);
      jest.spyOn(fileUpload, 'isAllowedUploadFilename').mockReturnValue(true);
      jest.spyOn(fileUpload, 'isFileTooLarge').mockReturnValue(false);
      jest.spyOn(fileUpload, 'getSavedUploadFiles').mockReturnValue([]);
      jest.spyOn(fileUpload, 'buildFileMetasFromMulter').mockReturnValue([newMeta]);
      const setSpy = jest.spyOn(fileUpload, 'setSavedUploadFiles');

      const req = {} as Request;
      const fields: FormFieldConfig[] = [{ name: 'myFile', type: 'file' }];

      const errors = validateAndAppendFileUploads(req, 'myStep', fields, mockT);

      expect(errors).toEqual({});
      expect(setSpy).toHaveBeenCalledWith(req, 'myStep', 'myFile', [newMeta]);
    });

    it('should append new files to existing saved files', () => {
      const multerFile = {
        originalname: 'test2.pdf',
        mimetype: 'application/pdf',
        size: 2048,
      } as Express.Multer.File;

      const existingFile = {
        id: 'existing',
        file_name: 'test1.pdf',
        content_type: 'application/pdf',
        size: 1024,
        url: '',
      };

      const newMeta = {
        id: 'new-id',
        file_name: 'test2.pdf',
        content_type: 'application/pdf',
        size: 2048,
        url: '',
      };

      jest.spyOn(helpers, 'getMulterFilesForField').mockReturnValue([multerFile]);
      jest.spyOn(fileUpload, 'isAllowedUploadFilename').mockReturnValue(true);
      jest.spyOn(fileUpload, 'isFileTooLarge').mockReturnValue(false);
      jest.spyOn(fileUpload, 'getSavedUploadFiles').mockReturnValue([existingFile]);
      jest.spyOn(fileUpload, 'buildFileMetasFromMulter').mockReturnValue([newMeta]);
      const setSpy = jest.spyOn(fileUpload, 'setSavedUploadFiles');

      const req = {} as Request;
      const fields: FormFieldConfig[] = [{ name: 'myFile', type: 'file' }];

      const errors = validateAndAppendFileUploads(req, 'myStep', fields, mockT);

      expect(errors).toEqual({});
      expect(setSpy).toHaveBeenCalledWith(req, 'myStep', 'myFile', [existingFile, newMeta]);
    });
  });
});
