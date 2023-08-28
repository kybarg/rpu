// const moment = require('moment');
const { encode, decode } = require('./src/utils');
const Encoder = require('./src/encoder');
const Printer = require('./src')

const {
  PublicAddress,
  CoinAmount,
  CoinName,
  CoinPrice,
  CoinType,
  CompanyName,
  CompanyPhone,
  CompanyWeb,
  FiatAmount,
  FiatType,
  Locale,
  OrderId,
  machineLocation,
} = {
  PublicAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  CoinAmount: 100,
  CoinName: 'Bitcoin',
  CoinPrice: 25300,
  CoinType: 'BTC',
  CompanyName: 'Chainbytes',
  CompanyPhone: '+12459864737',
  CompanyWeb: 'chainbytes.com',
  FiatAmount: 10000,
  FiatType: 'USD',
  Locale: 'en-US',
  OrderId: '111-324235434545',
  machineLocation: {
    address: 'Some Street 1',
    city: 'Allentown',
    state: 'PA'
  },
}

let {
  CompanyStreet,
  CompanyCityState,
} = {}

if (machineLocation && machineLocation.city && machineLocation.address) {
  CompanyStreet = machineLocation.address
  CompanyCityState = machineLocation.city
  if (machineLocation.state) CompanyCityState += `, ${machineLocation.state}`
}

const encoder = new Encoder({ codepageMapping: 'legacy' })

const content = encoder
  .initialize()
  .marginLeft(40)
  .align('center')
  .line('Thank you for using the Bitcoin ATM from', 46)
  .bold(true)
  .line(CompanyName)
  .bold(false)
  .line(CompanyStreet)
  .line(CompanyCityState)
  .line(CompanyPhone)
  .line(CompanyWeb)
  .newline()

  .line(`PROOF OF ${FiatType} RECEIVED`)
  .newline()

  .table(['PRICE', CoinPrice.toLocaleString(Locale, { style: 'currency', currency: FiatType })])
  .newline()

  .table(['CASH RCVD', FiatAmount.toLocaleString(Locale, { style: 'currency', currency: FiatType })])
  .newline()

  .table([`${CoinName.toUpperCase()} SENT`, `${CoinAmount} ${CoinType}`])
  .newline()

  .table(['ORDER ID', OrderId])
  .newline()
  .newline()

  .line('YOUR WALLET')
  .line(PublicAddress)
  .newline()
  .qrcode('test', 1, 6, 'a', 12)
  .newline()
  .line('This receipt is your record of cash you redeemed', 46)

  .newline()
  .cut()
  .encode()



const printer = new Printer({ path: 'COM5' })

printer.eventEmitter.on('ERROR', (error) => {
  console.log('ERROR', error)
})


async function printReceipt(content) {
  try {
    // connect printer
    if (!printer.port || !printer.port.isOpen) {
      await printer.open()
    }

    // get sensors status
    const status = await printer.command('CHECK_SENSOR_STATUS')
    console.log('CHECK_SENSOR_STATUS', status)

    const { paper, jamSensor } = status.data

    if (!paper) {
      throw new Error('Printer is out of paper!')
    }

    // try to unjam printer
    if (jamSensor) {
      const initializeResult = await printer.command('RPU_INITIALIZE')
      console.log('RPU_INITIALIZE', initializeResult)

      const status2 = await printer.command('CHECK_SENSOR_STATUS')
      console.log('CHECK_SENSOR_STATUS', status2)
      const { jamSensor: jamed2 } = status2.data

      if (jamed2) {
        throw new Error('Printer is jamed and failed to self fix')
      }
    }

    // set page start
    const iddatddResutl = await printer.command('IMAGE_DATA_DOWNLOAD_AND_TEXT_DATA_DOWNLOAD')
    console.log('IMAGE_DATA_DOWNLOAD_AND_TEXT_DATA_DOWNLOAD', iddatddResutl)

    const adpResutl = await printer.command('ASCII_DATA_PRINT', Buffer.from(content))
    console.log('ASCII_DATA_PRINT', adpResutl)

    // print receipt and cut
    const cutResult = await printer.command('CUT')
    console.log('CUT', cutResult)
  } catch (error) {
    console.log('printReceipt', error)
    console.log('hex', Buffer.from(content).toString('hex'))
  }
}

console.log(decode('ASCII_DATA_PRINT', Buffer.from("0206004f3030302000035a", "hex")))
console.log(decode('CHECK_SENSOR_STATUS', Buffer.from("0206005330303020000346", "hex")))


// (async function() {
//   try {
//     await printReceipt(content)
//   } catch (error) {
//     console.log('error', error)
//   }
// })()
