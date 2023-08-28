const SerialPort = require('serialport');
const { MockBinding } = require('@serialport/binding-mock');
const RPUPrinter = require('./index');
const Encoder = require('./encoder');

describe('RPUPrinter', () => {
  let printer;
  let content;

  beforeEach(() => {
    MockBinding.createPort('COM_MOCK', {
      echo: false,
      record: true,
      vendorId: 1,
      productId: 2,
    });

    printer = new RPUPrinter({ binding: MockBinding, path: 'COM_MOCK' });

    const encoder = new Encoder({ codepageMapping: 'legacy' });

    content = encoder
      .initialize()
      .align('center')
      .line('Very long testing line taht should be wraped', 46)
      .bold(true)
      .line('Bold')
      .bold(false)
      .italic(true)
      .line('Italic')
      .italic(false)
      .newline()
      .encode();
  });

  afterEach(() => {
    jest.clearAllMocks();
    MockBinding.reset();
  });

  test('should open port', async () => {
    await printer.open();
    expect(await MockBinding.list()).toContainEqual({
      locationId: undefined,
      manufacturer: 'The J5 Robotics Company',
      path: 'COM_MOCK',
      pnpId: undefined,
      productId: 2,
      serialNumber: '1',
      vendorId: 1,
    });
  });

  test('should handle command', async () => {
    await printer.open();
    const normal = [
      0x02, // STX
      0x06, // LI Low
      0x00, // LI High
      0x4f, // MI
      0x30, // Error status (0x30:Normal, 0x31:Before Action, 0x38:After Action)
      0x30, // skip
      0x00, // Error code
      0xc0, // Bit Mask Data
      0x00, // skip
      0x03, // ETX
      0x8a, // BCC
    ];

    let counter = 0;
    const responseInterval = setInterval(() => {
      if (
        printer.port.port.lastWrite &&
        Buffer.compare(printer.port.port.lastWrite, Buffer.from([0x05])) === 0
      ) {
        printer.port.port.lastWrite = null;
        if (counter < 3) {
          printer.port.port.emitData(Buffer.from([0x06]));
        } else {
          printer.port.port.emitData(Buffer.from(normal));
          clearInterval(responseInterval);
        }

        counter += 1;
      }
    }, 1);

    const result = await printer.command('ASCII_DATA_PRINT', content);
    expect(result).toEqual({ success: true });
  });
});
