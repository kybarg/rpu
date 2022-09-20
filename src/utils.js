const commands = require('./commands.list');
const errors = require('./errors.list');

function CRC8(array) {
  return Array.from(array).reduce((checksum, item) => checksum ^ item, 0);
}

function encode(name, params = []) {
  const { code } = commands[name];

  const STX = 0x02;
  const MI = code;
  const DATA = params;
  const ETX = 0x03;

  const length = [MI, ...DATA].length;
  const LEN1 = length & 0xff;
  const LEN2 = (length >> 8) & 0xff;

  const BCC = CRC8([LEN1, LEN2, MI, ...DATA, ETX]);

  return Buffer.from([STX, LEN1, LEN2, MI, ...DATA, ETX, BCC]);
}

function decode(command, buffer) {
  const result = {};

  if (buffer.length < 6) {
    result.success = false;
    result.message = 'Broken packet';
    result.data = [...buffer];
  }

  const MI = buffer[3];
  const DATA_LENGTH = buffer.slice(1, 3).readUInt16LE();
  const DATA = buffer.slice(4, DATA_LENGTH + 3);
  const BCC = buffer[buffer.length - 1];
  const BCC_CHECK = CRC8(buffer.slice(1, -1));

  if (BCC !== BCC_CHECK) {
    result.success = false;
    result.message = 'CRC check failed';

    return result;
  }

  // normal
  if (MI === 0x4f) {
    result.success = true;

    if (command === 'PROGRAM_VERSION_READ') {
      result.data = {
        printerName: DATA.slice(0, 3).toString(),
        version: `${DATA.slice(3, 5).readInt8()}.${DATA.slice(
          4,
          6
        ).readInt8()}`,
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

  // error
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

  // status
  if (MI === 0x53) {
    result.success = DATA[0] === 0x30;
    result.data = {
      hasPaper: !(DATA[3] & (1 << 7)),
      settingPaper: !(DATA[3] & (1 << 6)),
      lever: Boolean(DATA[3] & (1 << 4)),
      jamed: Boolean(DATA[3] & (1 << 3)),
      cutter: Boolean(DATA[3] & (1 << 1)),
    };
  }

  // if (MI === 0x4F || MI === 0x46 || MI === 0x53) {
  //   result.success = DATA[0] === 0x30;

  //   if (!result.success) {
  //     const statuses = {
  //       0x30: 'normal',
  //       0x31: 'before action',
  //       0x38: 'after action'
  //     }

  //     result.error = {
  //       code: DATA[2],
  //       message: errors[DATA[2]],
  //       status: statuses[DATA[0]],
  //     }
  //   }

  //   result.data = {
  //     paper: Boolean(DATA[3] & (1 << 7)),
  //     paperSetting: Boolean(DATA[3] & (1 << 6)),
  //     lever: Boolean(DATA[3] & (1 << 4)),
  //     jamed: Boolean(DATA[3] & (1 << 3)),
  //     cutter: Boolean(DATA[3] & (1 << 1)),
  //   };
  // }

  /**
   * 57.52 -version
   * cutter 0
   * paper1 1
   * paper2 1
   * jam 0
   * lever 0
   * paper load 0
   * near end 1
   */

  return result;
}

module.exports = {
  encode,
  decode,
  CRC8,
};
