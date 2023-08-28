const commands = require('./commands.list');
const errors = require('./errors.list');

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

function CRC8(array) {
  return array.reduce((checksum, item) => checksum ^ item, 0);
}

function encode(name, params = []) {
  const { code: MI } = commands[name];
  const length = [MI, ...params].length;
  const LEN1 = length & 0xff;
  const LEN2 = (length >> 8) & 0xff;

  const BCC = CRC8([LEN1, LEN2, MI, ...params, 0x03]);

  return Buffer.from([0x02, LEN1, LEN2, MI, ...params, 0x03, BCC]);
}

function decode(command, buffer) {
  if (buffer < 6 || buffer[0] !== 0x02) {
    throw new Error('Broken packet');
  }

  const MI = buffer[3];
  const DATA_LENGTH = buffer.slice(1, 3).readUInt16LE(0);
  const DATA = buffer.slice(4, DATA_LENGTH + 3);
  const BCC = buffer[buffer.length - 1];
  const BCC_CHECK = CRC8(buffer.slice(1, -1));

  if (DATA_LENGTH !== DATA.length + 1) {
    throw new Error('Packet length error');
  }

  if (BCC !== BCC_CHECK) {
    throw new Error('CRC check failed');
  }

  const result = {};

  // 'O' Normal end
  if (MI === 0x4f) {
    result.success = true;

    if (command === 'PROGRAM_VERSION_READ') {
      result.data = {
        printerName: DATA.slice(0, 3).toString(),
        version: `${DATA[3]}.${DATA[4]}`,
      };
    } else if (command === 'SETTING_READ') {
      const fonts = {
        0: 'hanmega1252',
        1: 'windows1250',
        2: 'windows1251',
      };

      result.data = {
        tphYStart: DATA[0] * 0.125,
        cutPosition: DATA[1] * 0.125,
        gapType: DATA[2],
        imageEndLine: DATA[3] * 0.125,
        fontKind: fonts[DATA[4]],
        // paperEscrow: DATA[5],
      };
    } else if (command === 'GET_DEVICE_INFORMATION') {
      const types = {
        0: '256KB',
        1: '512KB',
      };

      result.data = {
        sramType: types[DATA[0]],
      };
    }
  }

  // 'F' Abnormal end (error occur)
  if (MI === 0x46) {
    result.success = false;

    const statuses = {
      0x30: 'internal',
      0x31: 'beforeAction',
      0x38: 'afterAction',
    };

    result.error = {
      status: statuses[DATA[0]],
      code: DATA[2],
      message: errors[DATA[2]],
    };
  }

  // 'S' Status (Sensor) data
  if (MI === 0x53) {
    result.success = DATA[0] === 0x30;

    result.data = {
      paper: !(DATA[3] & (1 << 7)),
      paperSetting: !(DATA[3] & (1 << 6)),
      leverSensor: !!(DATA[3] & (1 << 4)),
      jamSensor: !!(DATA[3] & (1 << 3)),
      cutterSensor: !!(DATA[3] & (1 << 1)),
    };
  }

  return result;
}

function getCurrentTime() {
  return new Date().toISOString().slice(11, -1);
}

module.exports = {
  getCurrentTime,
  delay,
  encode,
  decode,
  CRC8,
};
