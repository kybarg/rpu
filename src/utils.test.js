const { getCurrentTime, delay, encode, decode, CRC8 } = require('./utils');
const commands = require('./commands.list');
const errors = require('./errors.list');

describe('utils.js tests', () => {
  describe('delay', () => {
    it('should resolve after a specified time', async () => {
      const startTime = Date.now();
      await delay(500);
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(500);
    });
  });

  describe('CRC8', () => {
    it('should return correct checksum', () => {
      const array = [0x01, 0x02, 0x03];
      expect(CRC8(array)).toEqual(0);
    });
  });

  describe('encode', () => {
    it('should return correct encoded buffer', () => {
      const buffer = encode('CHECK_SENSOR_STATUS');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer[3]).toEqual(commands.CHECK_SENSOR_STATUS.code);
    });
  });

  describe('decode', () => {
    it('should throw error for short buffer', () => {
      expect(() =>
        decode('CHECK_SENSOR_STATUS', Buffer.from([0x01, 0x02]))
      ).toThrow('Broken packet');
    });

    it('should decode PROGRAM_VERSION_READ command', () => {
      const buffer = Buffer.from([
        0x02, 0x07, 0x00, 0x4f, 0x52, 0x50, 0x55, 0x01, 0x02, 0x03, 0x1f,
      ]);
      const result = decode('PROGRAM_VERSION_READ', buffer);
      expect(result.success).toBe(true);
      expect(result.data.printerName).toBe('RPU');
      expect(result.data.version).toBe('1.2');
    });

    it('should decode SETTING_READ command', () => {
      const buffer = Buffer.from([
        0x02, 0x08, 0x00, 0x4f, 0x00, 0x01, 0x02, 0x03, 0x01, 0x03, 0x45,
      ]);
      const result = decode('SETTING_READ', buffer);
      expect(result.success).toBe(true);
      expect(result.data.tphYStart).toBeCloseTo(0);
      expect(result.data.cutPosition).toBeCloseTo(0.125);
      expect(result.data.gapType).toBe(2);
      expect(result.data.imageEndLine).toBeCloseTo(0.375);
      expect(result.data.fontKind).toBe('windows1250');
    });

    it('should decode GET_DEVICE_INFORMATION command', () => {
      const buffer = Buffer.from([
        0x02, 0x0b, 0x00, 0x4f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x03, 0x47,
      ]);
      const result = decode('GET_DEVICE_INFORMATION', buffer);
      expect(result.success).toBe(true);
      expect(result.data.sramType).toBe('256KB');
    });

    it('should decode error status', () => {
      const buffer = Buffer.from([
        0x02, 0x06, 0x00, 0x46, 0x30, 0x30, 0x31, 0x80, 0x03, 0xf2,
      ]);
      const result = decode('ANY_COMMAND', buffer);
      expect(result.success).toBe(false);
      expect(result.error.status).toBe('internal');
      expect(result.error.code).toBe(0x31);
      expect(result.error.message).toBe(errors[0x31]);
    });

    it('should decode status data', () => {
      const buffer = Buffer.from([
        0x02, 0x06, 0x00, 0x53, 0x30, 0x30, 0x00, 0x80, 0x03, 0xd6,
      ]);
      const result = decode('ANY_COMMAND', buffer);
      expect(result.success).toBe(true);
      expect(result.data.paper).toBe(false);
      expect(result.data.paperSetting).toBe(true);
      expect(result.data.leverSensor).toBe(false);
      expect(result.data.jamSensor).toBe(false);
      expect(result.data.cutterSensor).toBe(false);
    });
  });

  describe('getCurrentTime', () => {
    it('should return current time in HH:mm:ss.SSS format', () => {
      expect(getCurrentTime()).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    });
  });
});
