import {
  ACCEPT_ATTRIBUTE_EXTENSIONS,
  UPLOAD_MAX_FILE_SIZE_BYTES,
  UPLOAD_MAX_FILE_SIZE_MB,
  getFileExtensionLower,
  isBlockedExtension,
  validateFileType,
} from '@utils/documentUploadValidation';

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
  });

  describe('constants', () => {
    it('has 1GB max file size', () => {
      expect(UPLOAD_MAX_FILE_SIZE_MB).toBe(1024);
      expect(UPLOAD_MAX_FILE_SIZE_BYTES).toBe(1024 * 1024 * 1024);
    });

    it('has accept attribute string with sorted extensions', () => {
      expect(ACCEPT_ATTRIBUTE_EXTENSIONS).toContain('.pdf');
      expect(ACCEPT_ATTRIBUTE_EXTENSIONS).toContain('.doc');
      expect(ACCEPT_ATTRIBUTE_EXTENSIONS).toContain('.jpg');
      expect(typeof ACCEPT_ATTRIBUTE_EXTENSIONS).toBe('string');
    });
  });
});
