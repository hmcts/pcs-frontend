import {
  ACCEPT_ATTRIBUTE_EXTENSIONS,
  MEDIA_EXTENSIONS,
  UPLOAD_MAX_FILENAME_LENGTH,
  UPLOAD_MAX_FILE_SIZE_BYTES,
  UPLOAD_MAX_FILE_SIZE_MB,
  UPLOAD_MAX_MEDIA_FILE_SIZE_BYTES,
  UPLOAD_MAX_MEDIA_FILE_SIZE_MB,
  UPLOAD_MAX_TOTAL_SIZE_BYTES,
  UPLOAD_MAX_TOTAL_SIZE_MB,
  type ValidatableFile,
  formatSizeForDisplay,
  getFileExtensionLower,
  getUploadErrorKey,
  isBlockedExtension,
  isMediaExtension,
  validateFileType,
  validateUploadedFile,
} from '@utils/documentUploadValidation';

const MB = 1024 * 1024;

function file(overrides: Partial<ValidatableFile> = {}): ValidatableFile {
  return {
    originalname: 'doc.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    ...overrides,
  };
}

describe('documentUploadValidation', () => {
  describe('getFileExtensionLower', () => {
    it('extracts lowercase extension from filename', () => {
      expect(getFileExtensionLower('document.PDF')).toBe('.pdf');
    });

    it('handles multiple dots in filename', () => {
      expect(getFileExtensionLower('my.file.name.docx')).toBe('.docx');
    });

    it('returns empty string for filename without extension', () => {
      expect(getFileExtensionLower('README')).toBe('');
    });

    it('returns empty string for empty filename', () => {
      expect(getFileExtensionLower('')).toBe('');
    });

    it('handles dot at start of filename', () => {
      expect(getFileExtensionLower('.gitignore')).toBe('.gitignore');
    });
  });

  describe('isBlockedExtension', () => {
    it.each(['.mp3', '.m4a', '.mp4', '.mpeg', '.mpg'])('blocks %s', ext => {
      expect(isBlockedExtension(`file${ext}`)).toBe(true);
    });

    it.each(['.pdf', '.doc', '.jpg', '.txt', '.xlsx'])('allows %s', ext => {
      expect(isBlockedExtension(`file${ext}`)).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isBlockedExtension('file.MP3')).toBe(true);
    });
  });

  describe('validateFileType', () => {
    describe('allowed files', () => {
      it.each([
        ['application/pdf', 'report.pdf'],
        ['application/msword', 'letter.doc'],
        ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'letter.docx'],
        ['application/vnd.ms-excel', 'data.xls'],
        ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'data.xlsx'],
        ['image/jpeg', 'photo.jpg'],
        ['image/png', 'screenshot.png'],
        ['image/bmp', 'image.bmp'],
        ['image/tiff', 'scan.tiff'],
        ['text/plain', 'notes.txt'],
        ['text/csv', 'data.csv'],
        ['application/rtf', 'document.rtf'],
      ])('returns ok for %s (%s)', (mime, filename) => {
        expect(validateFileType(mime, filename)).toBe('ok');
      });
    });

    describe('blocked media files', () => {
      it.each([
        ['audio/mpeg', 'song.mp3'],
        ['audio/mp4', 'audio.m4a'],
        ['video/mp4', 'video.mp4'],
        ['video/mpeg', 'clip.mpeg'],
        ['audio/x-m4a', 'track.m4a'],
      ])('returns blocked_media for %s (%s)', (mime, filename) => {
        expect(validateFileType(mime, filename)).toBe('blocked_media');
      });

      it('blocks by extension even with empty mime type', () => {
        expect(validateFileType('', 'song.mp3')).toBe('blocked_media');
      });

      it('blocks any audio/* mime prefix', () => {
        expect(validateFileType('audio/wav', 'sound.wav')).toBe('blocked_media');
      });

      it('blocks any video/* mime prefix', () => {
        expect(validateFileType('video/quicktime', 'movie.mov')).toBe('blocked_media');
      });
    });

    describe('invalid file types', () => {
      it('returns invalid_type for unknown mime and extension', () => {
        expect(validateFileType('application/x-executable', 'app.exe')).toBe('invalid_type');
      });

      it('returns invalid_type for html files', () => {
        expect(validateFileType('text/html', 'page.html')).toBe('invalid_type');
      });
    });

    describe('octet-stream fallback to extension', () => {
      it('allows application/octet-stream with valid extension', () => {
        expect(validateFileType('application/octet-stream', 'doc.pdf')).toBe('ok');
      });

      it('rejects application/octet-stream with invalid extension', () => {
        expect(validateFileType('application/octet-stream', 'app.exe')).toBe('invalid_type');
      });

      it('allows empty mime with valid extension', () => {
        expect(validateFileType('', 'doc.pdf')).toBe('ok');
      });

      it('rejects empty mime with invalid extension', () => {
        expect(validateFileType('', 'app.exe')).toBe('invalid_type');
      });
    });

    describe('filename length', () => {
      const longBase = 'a'.repeat(UPLOAD_MAX_FILENAME_LENGTH);

      it('returns filename_too_long when name exceeds the cap', () => {
        expect(validateFileType('application/pdf', `${longBase}.pdf`)).toBe('filename_too_long');
      });

      it('accepts a name exactly at the cap', () => {
        // base + .pdf = UPLOAD_MAX_FILENAME_LENGTH + 4 ⇒ too long; size to total == cap
        const exact = 'a'.repeat(UPLOAD_MAX_FILENAME_LENGTH - 4) + '.pdf';
        expect(exact).toHaveLength(UPLOAD_MAX_FILENAME_LENGTH);
        expect(validateFileType('application/pdf', exact)).toBe('ok');
      });

      it('still blocks media before checking filename length', () => {
        // Precedence: blocked_media wins even if the name is also over-length.
        expect(validateFileType('audio/mp3', `${longBase}.mp3`)).toBe('blocked_media');
      });
    });
  });

  describe('isMediaExtension', () => {
    it.each(['.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff'])('flags %s as media', ext => {
      expect(isMediaExtension(`pic${ext}`)).toBe(true);
    });

    it.each(['.pdf', '.doc', '.docx', '.txt', '.csv'])('does not flag %s as media', ext => {
      expect(isMediaExtension(`file${ext}`)).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isMediaExtension('photo.JPG')).toBe(true);
    });
  });

  describe('formatSizeForDisplay', () => {
    it.each([
      [1024, '1GB'],
      [2048, '2GB'],
      [4096, '4GB'],
    ])('formats whole gigabytes (%s MB) as "%s"', (mb, expected) => {
      expect(formatSizeForDisplay(mb)).toBe(expected);
    });

    it.each([
      [500, '500MB'],
      [100, '100MB'],
      [1500, '1500MB'],
    ])('formats non-whole-GB values (%s MB) as "%s"', (mb, expected) => {
      expect(formatSizeForDisplay(mb)).toBe(expected);
    });

    it('handles 0 as "0MB"', () => {
      expect(formatSizeForDisplay(0)).toBe('0MB');
    });
  });

  describe('constants', () => {
    it('has 1024MB max file size per file', () => {
      expect(UPLOAD_MAX_FILE_SIZE_MB).toBe(1024);
      expect(UPLOAD_MAX_FILE_SIZE_BYTES).toBe(1024 * 1024 * 1024);
    });

    it('has 4GB max total file size', () => {
      expect(UPLOAD_MAX_TOTAL_SIZE_MB).toBe(4096);
      expect(UPLOAD_MAX_TOTAL_SIZE_BYTES).toBe(4096 * 1024 * 1024);
    });

    it('has 500MB max media file size', () => {
      expect(UPLOAD_MAX_MEDIA_FILE_SIZE_MB).toBe(500);
      expect(UPLOAD_MAX_MEDIA_FILE_SIZE_BYTES).toBe(500 * 1024 * 1024);
    });

    it('has 4096MB (4GB) max total file size', () => {
      expect(UPLOAD_MAX_TOTAL_SIZE_MB).toBe(4096);
      expect(UPLOAD_MAX_TOTAL_SIZE_BYTES).toBe(4096 * 1024 * 1024);
    });

    it('has 255-character max filename length', () => {
      expect(UPLOAD_MAX_FILENAME_LENGTH).toBe(255);
    });

    it('has accept attribute string with sorted extensions', () => {
      expect(ACCEPT_ATTRIBUTE_EXTENSIONS).toContain('.pdf');
      expect(ACCEPT_ATTRIBUTE_EXTENSIONS).toContain('.doc');
      expect(ACCEPT_ATTRIBUTE_EXTENSIONS).toContain('.jpg');
      expect(typeof ACCEPT_ATTRIBUTE_EXTENSIONS).toBe('string');
    });
  });

  describe('MEDIA_EXTENSIONS / isMediaExtension', () => {
    it.each(['.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff'])('includes %s', ext => {
      expect(MEDIA_EXTENSIONS.has(ext)).toBe(true);
    });

    it.each(['.pdf', '.doc', '.xlsx', '.txt'])('excludes %s', ext => {
      expect(MEDIA_EXTENSIONS.has(ext)).toBe(false);
    });

    it('isMediaExtension is case insensitive', () => {
      expect(isMediaExtension('photo.JPG')).toBe(true);
      expect(isMediaExtension('letter.PDF')).toBe(false);
    });
  });

  describe('validateUploadedFile', () => {
    it('returns null for an allowed file with no options', () => {
      expect(validateUploadedFile(file())).toBeNull();
    });

    it('returns blocked_media for audio/video', () => {
      expect(validateUploadedFile(file({ originalname: 'song.mp3', mimetype: 'audio/mpeg' }))).toEqual({
        kind: 'blocked_media',
      });
    });

    it('returns invalid_type for unsupported types', () => {
      expect(validateUploadedFile(file({ originalname: 'app.exe', mimetype: 'application/x-executable' }))).toEqual({
        kind: 'invalid_type',
      });
    });

    describe('filename length', () => {
      it('returns filename_too_long when over the limit', () => {
        const longName = 'a'.repeat(260) + '.pdf';
        expect(validateUploadedFile(file({ originalname: longName }), { maxFilenameLength: 255 })).toEqual({
          kind: 'filename_too_long',
          maxLength: 255,
        });
      });

      it('passes at exactly the limit', () => {
        const name = 'a'.repeat(251) + '.pdf'; // 255 chars total
        expect(validateUploadedFile(file({ originalname: name }), { maxFilenameLength: 255 })).toBeNull();
      });

      it('skips the check when maxFilenameLength is omitted', () => {
        const longName = 'a'.repeat(500) + '.pdf';
        expect(validateUploadedFile(file({ originalname: longName }))).toBeNull();
      });
    });

    describe('size — branched doc vs media', () => {
      const opts = { maxDocumentBytes: 1024 * MB, maxMediaBytes: 500 * MB };

      it('returns document_too_large for an oversized document', () => {
        expect(validateUploadedFile(file({ size: 1025 * MB }), opts)).toEqual({
          kind: 'document_too_large',
          maxBytes: 1024 * MB,
        });
      });

      it('returns media_too_large for an oversized image', () => {
        expect(
          validateUploadedFile(file({ originalname: 'photo.jpg', mimetype: 'image/jpeg', size: 501 * MB }), opts)
        ).toEqual({
          kind: 'media_too_large',
          maxBytes: 500 * MB,
        });
      });

      it('allows a 600MB document (under doc cap) even though over media cap', () => {
        expect(validateUploadedFile(file({ size: 600 * MB }), opts)).toBeNull();
      });

      it('allows a 400MB image (under media cap)', () => {
        expect(
          validateUploadedFile(file({ originalname: 'photo.jpg', mimetype: 'image/jpeg', size: 400 * MB }), opts)
        ).toBeNull();
      });
    });

    describe('size — generic per-file fallback', () => {
      it('returns file_too_large when over maxPerFileBytes', () => {
        expect(validateUploadedFile(file({ size: 101 * MB }), { maxPerFileBytes: 100 * MB })).toEqual({
          kind: 'file_too_large',
          maxBytes: 100 * MB,
        });
      });

      it('does not apply the generic fallback when doc/media caps are set', () => {
        const opts = { maxDocumentBytes: 1024 * MB, maxMediaBytes: 500 * MB, maxPerFileBytes: 10 * MB };
        expect(validateUploadedFile(file({ size: 50 * MB }), opts)).toBeNull();
      });

      it('skips size check entirely when no size option is provided', () => {
        expect(validateUploadedFile(file({ size: 10 * 1024 * MB }))).toBeNull();
      });
    });

    describe('precedence', () => {
      const opts = {
        maxFilenameLength: 10,
        maxDocumentBytes: 1,
        maxMediaBytes: 1,
        maxPerFileBytes: 1,
      };

      it('blocked_media beats filename and size', () => {
        expect(
          validateUploadedFile(
            file({ originalname: 'this_filename_is_too_long.mp3', mimetype: 'audio/mpeg', size: 1024 * MB }),
            opts
          )
        ).toEqual({ kind: 'blocked_media' });
      });

      it('invalid_type beats filename and size', () => {
        expect(
          validateUploadedFile(
            file({
              originalname: 'this_filename_is_too_long.exe',
              mimetype: 'application/x-executable',
              size: 1024 * MB,
            }),
            opts
          )
        ).toEqual({ kind: 'invalid_type' });
      });

      it('filename_too_long beats size', () => {
        expect(validateUploadedFile(file({ originalname: 'a_very_long_filename.pdf', size: 1024 * MB }), opts)).toEqual(
          { kind: 'filename_too_long', maxLength: 10 }
        );
      });
    });
  });

  describe('getUploadErrorKey', () => {
    it('maps blocked_media to wrongFileTypeDocStore', () => {
      expect(getUploadErrorKey({ kind: 'blocked_media' })).toEqual({
        key: 'errors.documentUpload.wrongFileTypeDocStore',
      });
    });

    it('maps invalid_type to wrongFileTypeDocStore', () => {
      expect(getUploadErrorKey({ kind: 'invalid_type' })).toEqual({
        key: 'errors.documentUpload.wrongFileTypeDocStore',
      });
    });

    it('maps filename_too_long with maxLength param', () => {
      expect(getUploadErrorKey({ kind: 'filename_too_long', maxLength: 255 })).toEqual({
        key: 'errors.documentUpload.filenameTooLong',
        params: { maxLength: 255 },
      });
    });

    it('maps document_too_large with maxSize in MB', () => {
      expect(getUploadErrorKey({ kind: 'document_too_large', maxBytes: 1024 * MB })).toEqual({
        key: 'errors.documentUpload.fileTooLargeDocument',
        params: { maxSize: 1024 },
      });
    });

    it('maps media_too_large with maxSize in MB', () => {
      expect(getUploadErrorKey({ kind: 'media_too_large', maxBytes: 500 * MB })).toEqual({
        key: 'errors.documentUpload.fileTooLargeMedia',
        params: { maxSize: 500 },
      });
    });

    it('maps file_too_large with maxSize in MB', () => {
      expect(getUploadErrorKey({ kind: 'file_too_large', maxBytes: 100 * MB })).toEqual({
        key: 'errors.documentUpload.fileTooLargeDocStore',
        params: { maxSize: 100 },
      });
    });
  });
});
