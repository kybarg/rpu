const commands = {
  CHECK_SENSOR_STATUS: {
    code: 0x53,
    ascii: 'S',
    description: 'Get RPU Sensor information.',
  },
  RPU_INITIALIZE: {
    code: 0x49,
    ascii: 'I',
    description: 'Initialize RPU and remove all remain bills in the passage.',
  },
  ASCII_DATA_PRINT: {
    code: 0x50,
    ascii: 'P',
    description: 'Print Data and ESC Command Code.',
  },
  PAGE_DATA_PRINT: {
    code: 0x54,
    ascii: 'T',
    description: 'Data Print(ASCII)-Page Mode ',
  },
  IMAGE_DATA_DOWNLOAD_AND_PRINT_SRAM: {
    code: 0x4d,
    ascii: 'M',
    description: 'Image Data saves in SRAM and print.',
  },
  BIG_IMAGE_DATA_DOWNLOAD_AND_PRINT_SRAM: {
    code: 0x42,
    ascii: 'B',
    description: 'Big Image Data(Maximum 128K) saves in SRAM and print.',
  },
  IMAGE_DATA_PRINT_SRAM: {
    code: 0x6d,
    ascii: 'm',
    description: 'Print the Image Data',
  },
  PAPER_SETTING: {
    code: 0x4c,
    ascii: 'L',
    description:
      'Load paper on RPU, Feed the paper, print out "LOAD PRINT OK" and cut the paper.',
  },
  CUT: {
    code: 0x43,
    ascii: 'C',
    description: 'Cut paper.',
  },
  PROGRAM_VERSION_READ: {
    code: 0x56,
    ascii: 'V',
    description: 'Get RPU version information.',
  },
  IMAGE_DATA_PRINT_FLASH: {
    code: 0x52,
    ascii: 'R',
    description: 'Print image data saved in Flash ROM.',
  },
  IMAGE_DATA_DOWNLOAD_FLASH: {
    code: 0x44,
    ascii: 'D',
    description: 'Download image data to the Flash ROM.',
  },
  SETTING_READ: {
    code: 0x4a,
    ascii: 'J',
    description:
      'Read the setting status. Response Data’s 5bytes means setting status not Sensor status',
  },
  SETTING_WRITE: {
    code: 0x4b,
    ascii: 'K',
    description: 'Save Setting value',
  },
  IMAGE_DATA_DOWNLOAD_AND_TEXT_DATA_DOWNLOAD: {
    code: 0x41,
    ascii: 'A',
    description: 'Page start',
  },
  FONT_DATA_DOWNLOAD: {
    code: 0x48,
    ascii: 'H',
    description: 'Download Font Data to Flash ROM.',
  },
  GET_DEVICE_INFORMATION: {
    code: 0x47,
    ascii: 'G',
    description: 'Device Information Data Read.',
  },
};

module.exports = commands;
