const moment = require('moment');
const { CRC8, encode } = require('./src/utils');
const Encoder = require('./src/encoder');


// 0x02, 0x06, 0x00, 0x53, 0x30, 0x30, 0x30, 0xA8, 0x00, 0x03, 0xCE


// r 0x02, 0x06, 0x00, 0x4F, 0x52, 0x50, 0x55, 0x39, 0x34, 0x03, 0x10
// s 0x02, 0x01, 0x00, 0x53, 0x03, 0x51

// s 0x02, 0x01, 0x00, 0x56, 0x03, 0x54


const data = [
  Buffer.from([0x06, 0x00, 0x53, 0x30, 0x30, 0x30, 0xA8, 0x00, 0x03]),
  Buffer.from([0x06, 0x00, 0x4F, 0x52, 0x50, 0x55, 0x39, 0x34, 0x03]),
  Buffer.from([0x01, 0x00, 0x53, 0x03]),
  Buffer.from([0x01, 0x00, 0x56, 0x03]),
]

const algs = ['CRC-8',
  'CDMA2000',
  'DARC',
  'DVB-S2',
  'EBU',
  'I-CODE',
  'ITU',
  'MAXIM',
  'ROHC',
  'WCDMA']

data.forEach((buff) => {
  // const m1 = crc1.calculate(buff)
  // const m2 = crc2.calculate(buff)
  // const m3 = crc1.calculate_no_table(buff)
  // const m4 = crc2.calculate_no_table(buff)

  // const m5 = crc3.calculate(buff)
  // const m6 = crc4.calculate(buff)
  // const m7 = crc3.calculate_no_table(buff)
  // const m8 = crc4.calculate_no_table(buff)

  // console.log(m1 === 0x54, m1.toString(16))
  // console.log(m2 === 0x54, m2.toString(16))
  // console.log(m3 === 0x54, m3.toString(16))
  // console.log(m4 === 0x54, m4.toString(16))

  // console.log(m5 === 0x54, m5.toString(16))
  // console.log(m6 === 0x54, m6.toString(16))
  // console.log(m7 === 0x54, m7.toString(16))
  // console.log(m8 === 0x54, m8.toString(16))

  // console.log(CRC8(buff).toString(16))

  // algs.forEach((a) => {


  //   let checksum = crc8(a, buff);

  //   console.log(checksum == 0xCE, checksum.toString(16));// "cb"
  // })
})

// FF 22
const length = 85
const LEN1 = length & 0xFF;
const LEN2 = (length >> 8) & 0xFF;
// console.log(LEN1.toString(16), LEN2.toString(16))

// console.log(Buffer.from([LEN1, LEN2]).readUInt16LE())

// const enc = new Encoder({ codepageMapping: 'legacy' })

// const content = enc
//   .qrcode('http://genmega.com', 1, 8, 'a', 12)
//   .encode()


// console.log(Buffer.from(content))



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
} = data

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

  .table(['TIME', moment().format('MM/DD/YYYY HH:mm:ss')])
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
  .qrcode(PublicAddress, 1, 6, 'a', 12)
  .newline()
  .line('This receipt is your record of cash you redeemed', 46)

  .newline()
  .cut()
  .encode()


// console.log(JSON.stringify([...content]))

const sss = encode('ASCII_DATA_PRINT', [...content])
console.log(sss)
