import type { Request } from 'express';

import {
  ALLOWED_FILE_EXTENSIONS,
  DEFAULT_FILE_ACCEPT,
  FILE_TOO_LARGE_ERROR_FALLBACK,
  FILE_TYPE_ERROR_FALLBACK,
  MAX_FILE_SIZE_BYTES,
  buildFileMetasFromMulter,
  getSavedUploadFiles,
  isAllowedUploadFilename,
  isFileTooLarge,
  savedFilesSessionKey,
  setSavedUploadFiles,
} from '@modules/steps/formBuilder/fileUpload';

describe('fileUpload', () => {
  describe('constants', () => {
    it('should export ALLOWED_FILE_EXTENSIONS', () => {
      expect(ALLOWED_FILE_EXTENSIONS).toBeInstanceOf(Set);
      expect(ALLOWED_FILE_EXTENSIONS.has('.pdf')).toBe(true);
      expect(ALLOWED_FILE_EXTENSIONS.has('.jpg')).toBe(true);
      expect(ALLOWED_FILE_EXTENSIONS.has('.jpeg')).toBe(true);
      expect(ALLOWED_FILE_EXTENSIONS.has('.png')).toBe(true);
    });

    it('should export DEFAULT_FILE_ACCEPT string', () => {
      expect(DEFAULT_FILE_ACCEPT).toContain('.pdf');
      expect(DEFAULT_FILE_ACCEPT).toContain('.jpg');
    });

    it('should export FILE_TYPE_ERROR_FALLBACK', () => {
      expect(FILE_TYPE_ERROR_FALLBACK).toBeTruthy();
      expect(typeof FILE_TYPE_ERROR_FALLBACK).toBe('string');
    });

    it('should export FILE_TOO_LARGE_ERROR_FALLBACK', () => {
      expect(FILE_TOO_LARGE_ERROR_FALLBACK).toBeTruthy();
      expect(typeof FILE_TOO_LARGE_ERROR_FALLBACK).toBe('string');
    });

    it('should export MAX_FILE_SIZE_BYTES', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(1024 * 1024 * 1024); // 1024MB
    });
  });

  describe('savedFilesSessionKey', () => {
    it('should return correct session key for field name', () => {
      expect(savedFilesSessionKey('myField')).toBe('myFieldSavedFiles');
    });
  });

  describe('isAllowedUploadFilename', () => {
    it('should return true for allowed extensions', () => {
      expect(isAllowedUploadFilename('document.pdf')).toBe(true);
      expect(isAllowedUploadFilename('image.jpg')).toBe(true);
      expect(isAllowedUploadFilename('photo.jpeg')).toBe(true);
      expect(isAllowedUploadFilename('screenshot.png')).toBe(true);
    });

    it('should return true for uppercase extensions', () => {
      expect(isAllowedUploadFilename('document.PDF')).toBe(true);
      expect(isAllowedUploadFilename('image.JPG')).toBe(true);
    });

    it('should return false for disallowed extensions', () => {
      expect(isAllowedUploadFilename('script.exe')).toBe(false);
      expect(isAllowedUploadFilename('archive.zip')).toBe(false);
      expect(isAllowedUploadFilename('file.bat')).toBe(false);
    });

    it('should return false for files without extensions', () => {
      expect(isAllowedUploadFilename('noextension')).toBe(false);
    });

    it('should handle files with multiple dots', () => {
      expect(isAllowedUploadFilename('my.document.pdf')).toBe(true);
      expect(isAllowedUploadFilename('my.file.exe')).toBe(false);
    });
  });

  describe('isFileTooLarge', () => {
    it('should return true for files larger than MAX_FILE_SIZE_BYTES', () => {
      const largeFile = { size: MAX_FILE_SIZE_BYTES + 1 } as Express.Multer.File;
      expect(isFileTooLarge(largeFile)).toBe(true);
    });

    it('should return false for files smaller than MAX_FILE_SIZE_BYTES', () => {
      const smallFile = { size: 1024 } as Express.Multer.File;
      expect(isFileTooLarge(smallFile)).toBe(false);
    });

    it('should return false for files exactly at MAX_FILE_SIZE_BYTES', () => {
      const exactFile = { size: MAX_FILE_SIZE_BYTES } as Express.Multer.File;
      expect(isFileTooLarge(exactFile)).toBe(false);
    });
  });

  describe('getSavedUploadFiles', () => {
    it('should return empty array when no files saved', () => {
      const req = {
        session: {
          formData: {
            myStep: {},
          },
        },
      } as unknown as Request;

      const result = getSavedUploadFiles(req, 'myStep', 'myField');
      expect(result).toEqual([]);
    });

    it('should return saved files from session', () => {
      const savedFiles = [{ id: '1', file_name: 'test.pdf', content_type: 'application/pdf', size: 1024, url: '' }];
      const req = {
        session: {
          formData: {
            myStep: {
              myFieldSavedFiles: savedFiles,
            },
          },
        },
      } as unknown as Request;

      const result = getSavedUploadFiles(req, 'myStep', 'myField');
      expect(result).toEqual(savedFiles);
    });

    it('should return empty array when formData is undefined', () => {
      const req = {
        session: {},
      } as unknown as Request;

      const result = getSavedUploadFiles(req, 'myStep', 'myField');
      expect(result).toEqual([]);
    });
  });

  describe('setSavedUploadFiles', () => {
    it('should save files to session', () => {
      const req = {
        session: {
          formData: {
            myStep: {},
          },
        },
      } as any;

      const files = [{ id: '1', file_name: 'test.pdf', content_type: 'application/pdf', size: 1024, url: '' }];

      setSavedUploadFiles(req, 'myStep', 'myField', files);

      expect(req.session.formData.myStep.myFieldSavedFiles).toEqual(files);
    });

    it('should initialize formData if undefined', () => {
      const req = {
        session: {},
      } as any;

      const files = [{ id: '1', file_name: 'test.pdf', content_type: 'application/pdf', size: 1024, url: '' }];

      setSavedUploadFiles(req, 'myStep', 'myField', files);

      expect(req.session.formData).toBeDefined();
      expect(req.session.formData.myStep.myFieldSavedFiles).toEqual(files);
    });
  });

  describe('buildFileMetasFromMulter', () => {
    it('should build file metadata from multer files', () => {
      const multerFiles = [
        {
          originalname: 'test.pdf',
          mimetype: 'application/pdf',
          size: 1024,
        },
      ] as Express.Multer.File[];

      const result = buildFileMetasFromMulter(multerFiles);

      expect(result).toHaveLength(1);
      expect(result[0].file_name).toBe('test.pdf');
      expect(result[0].content_type).toBe('application/pdf');
      expect(result[0].size).toBe(1024);
      expect(result[0].url).toBe('');
      expect(result[0].id).toBeTruthy();
    });

    it('should generate unique IDs for each file', () => {
      const multerFiles = [
        { originalname: 'file1.pdf', mimetype: 'application/pdf', size: 1024 },
        { originalname: 'file2.pdf', mimetype: 'application/pdf', size: 2048 },
      ] as Express.Multer.File[];

      const result = buildFileMetasFromMulter(multerFiles);

      expect(result).toHaveLength(2);
      expect(result[0].id).not.toBe(result[1].id);
    });

    it('should return empty array for empty input', () => {
      const result = buildFileMetasFromMulter([]);
      expect(result).toEqual([]);
    });
  });
});
