// const moment = require('moment');
const { encode, decode } = require('./src/utils');
const Encoder = require('./src/encoder');
const Printer = require('./src');

const printer = new Printer({ path: 'COM5' });

printer.eventEmitter.on('ERROR', (error) => {
  console.log('ERROR', error);
});

async function printReceipt(content) {
  console.log('hex', Buffer.from(content).toString('hex'));
  try {
    // connect printer
    if (!printer.port || !printer.port.isOpen) {
      await printer.open();
    }

    // get sensors status
    const status = await printer.command('CHECK_SENSOR_STATUS');
    console.log('CHECK_SENSOR_STATUS', status);

    const { paper, jamSensor } = status.data;

    if (!paper) {
      throw new Error('Printer is out of paper!');
    }

    // try to unjam printer
    if (jamSensor) {
      const initializeResult = await printer.command('RPU_INITIALIZE');
      console.log('RPU_INITIALIZE', initializeResult);

      const status2 = await printer.command('CHECK_SENSOR_STATUS');
      console.log('CHECK_SENSOR_STATUS', status2);
      const { jamSensor: jamed2 } = status2.data;

      if (jamed2) {
        throw new Error('Printer is jamed and failed to self fix');
      }
    }

    // set page start
    const iddatddResutl = await printer.command(
      'IMAGE_DATA_DOWNLOAD_AND_TEXT_DATA_DOWNLOAD'
    );
    console.log('IMAGE_DATA_DOWNLOAD_AND_TEXT_DATA_DOWNLOAD', iddatddResutl);

    const adpResutl = await printer.command(
      'ASCII_DATA_PRINT',
      Buffer.from(content)
    );
    console.log('ASCII_DATA_PRINT', adpResutl);

    // print receipt and cut
    const cutResult = await printer.command('CUT');
    console.log('CUT', cutResult);
  } catch (error) {
    console.log('printReceipt', error);
  }
}

function printPaperWallet() {
  const CompanyName = 'CompanyName';
  const CoinName = 'Bitcoin';
  const PublicKey = 'IFt3cRS13tVz6mnfCnUuYpp3mtPc34Sm36';
  const PrivateKey = 'L2FQvDoUUhhUArCUcimeE1lhYdnVDvK6BXLTuy09kAcScbSRr';

  const encoder = new Encoder();

  const content = encoder
    .initialize()
    .marginLeft(40)
    .align('center')
    .bold(true)
    .line(CompanyName)
    .bold(false)

    .line("Here is your paper wallet's PUBLIC KEY:", 46)
    .newline()
    .qrcode(PublicKey, 1, 0, 'a', 12)
    .newline()
    .line(PublicKey)
    .newline()

    .align('left')
    .line(
      `You may ADD ${CoinName} to this wallet address by scanning the public address above.`,
      46
    )
    .newline()

    .align('center')
    .line("Here is your paper wallet's PRIVATE KEY:", 46)
    .newline()
    .qrcode(PrivateKey, 1, 0, 'a', 12)
    .newline()
    .line(PrivateKey)
    .newline()

    .line(`Use this key to send or withdraw ${CoinName}`, 46)
    .line('DO NOT LOSE OR SHARE THIS PRIVATE KEY.', 46)
    .newline()
    .cut()
    .encode();

  printReceipt(content, 'printPaperWallet');
}

// console.log(
//   decode('ASCII_DATA_PRINT', Buffer.from('0206004f3030302000035a', 'hex'))
// );
// console.log(
//   decode('CHECK_SENSOR_STATUS', Buffer.from('0206005330303020000346', 'hex'))
// );

(async function () {
  try {
    await printPaperWallet();
  } catch (error) {
    console.log('error', error);
  }
})();
