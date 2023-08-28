const linewrap = require('linewrap');
// const { createCanvas } = require('canvas');
// const Dither = require('canvas-dither');
// const Flatten = require('canvas-flatten');

/**
 * Create a byte stream based on commands for ESC/POS printers
 */
class EscPosEncoder {
  /**
   * Create a new object
   *
   * @param  {object}   options   Object containing configuration options
   */
  constructor(options) {
    this._reset(options);
  }

  /**
   * Reset the state of the object
   *
   * @param  {object}   options   Object containing configuration options
   */
  _reset(options) {
    this._options = Object.assign(
      {
        width: null,
        embedded: false,
        wordWrap: true,
        imageMode: 'column',
        codepageMapping: 'epson',
        codepageCandidates: [
          'cp437',
          'cp858',
          'cp860',
          'cp861',
          'cp863',
          'cp865',
          'cp852',
          'cp857',
          'cp855',
          'cp866',
          'cp869',
        ],
      },
      options
    );

    this._embedded = this._options.width && this._options.embedded;

    this._buffer = [];
    this._queued = [];
    this._cursor = 0;
    this._codepage = 'ascii';

    this._state = {
      codepage: 0,
      align: 'left',
      bold: false,
      italic: false,
      underline: false,
      invert: false,
      width: 1,
      height: 1,
    };
  }

  /**
   * Encode a string with the current code page
   *
   * @param  {string}   value  String to encode
   * @return {object}          Encoded string as a ArrayBuffer
   *
   */
  _encode(value) {
    return Buffer.from(value, 'ascii');
  }

  /**
   * Add commands to the queue
   *
   * @param  {array}   value  Add array of numbers, arrays, buffers or Uint8Arrays to add to the buffer
   *
   */
  _queue(value) {
    value.forEach((item) => this._queued.push(item));
  }

  /**
   * Flush current queue to the buffer
   *
   */
  _flush() {
    if (this._embedded) {
      let indent = this._options.width - this._cursor;

      if (this._state.align == 'left') {
        this._queued.push(new Array(indent).fill(0x20));
      }

      if (this._state.align == 'center') {
        const remainder = indent % 2;
        indent = indent >> 1;

        if (indent > 0) {
          this._queued.push(new Array(indent).fill(0x20));
        }

        if (indent + remainder > 0) {
          this._queued.unshift(new Array(indent + remainder).fill(0x20));
        }
      }

      if (this._state.align == 'right') {
        this._queued.unshift(new Array(indent).fill(0x20));
      }
    }

    this._buffer = this._buffer.concat(this._queued);

    this._queued = [];
    this._cursor = 0;
  }

  /**
   * Wrap the text while respecting the position of the cursor
   *
   * @param  {string}   value     String to wrap after the width of the paper has been reached
   * @param  {number}   position  Position on which to force a wrap
   * @return {array}              Array with each line
   */
  _wrap(value, position) {
    if (position || (this._options.wordWrap && this._options.width)) {
      const indent = '-'.repeat(this._cursor);
      const w = linewrap(position || this._options.width, {
        lineBreak: '\n',
        whitespace: 'all',
      });
      const result = w(indent + value)
        .substring(this._cursor)
        .split('\n');

      return result;
    }

    return [value];
  }

  /**
   * Restore styles and codepages after drawing boxes or lines
   */
  _restoreState() {
    this.bold(this._state.bold);
    this.italic(this._state.italic);
    this.underline(this._state.underline);
    this.invert(this._state.invert);
  }

  /**
   * Initialize the printer
   *
   * @return {object}          Return the object, for easy chaining commands
   *
   */
  initialize() {
    // this._queue([
    //   0x1b, 0x21,
    // ]);

    this._flush();

    return this;
  }

  /**
   * Set left margin
   *
   * @return {object}          Return the object, for easy chaining commands
   *
   */
  marginLeft() {
    // if (!nL) nL = 0
    // if (!nH) nH = 0

    // if (nL < 0 || nL > 255) {
    //   throw new Error('Magin should be <= 0 and >= 255')
    // }

    // if (nH < 0 || nH > 255) {
    //   throw new Error('Width should be <= 0 and >= 255')
    // }

    // this._queue([
    //   0x1d, 0x4c, nL, nH,
    //   // 0x1d, 0x4c, .5
    //   // 0x1b, 0x24, 0, 2
    // ])

    return this;
  }

  /**
   * Print text
   *
   * @param  {string}   value  Text that needs to be printed
   * @param  {number}   wrap   Wrap text after this many positions
   * @return {object}          Return the object, for easy chaining commands
   *
   */
  text(value, wrap) {
    const lines = this._wrap(value, wrap);

    for (let l = 0; l < lines.length; l++) {
      const bytes = this._encode(lines[l]);

      this._queue([bytes]);

      this._cursor += lines[l].length * this._state.width;

      if (this._options.width && !this._embedded) {
        this._cursor = this._cursor % this._options.width;
      }

      if (l < lines.length - 1) {
        this.newline();
      }
    }

    return this;
  }

  /**
   * Print a newline
   *
   * @return {object}          Return the object, for easy chaining commands
   *
   */
  newline() {
    this._flush();

    this._queue([0x0d, 0x0a]);

    if (this._embedded) {
      this._restoreState();
    }

    return this;
  }

  /**
   * Print text, followed by a newline
   *
   * @param  {string}   value  Text that needs to be printed
   * @param  {number}   wrap   Wrap text after this many positions
   * @return {object}          Return the object, for easy chaining commands
   *
   */
  line(value, wrap) {
    this.text(value, wrap);
    this.newline();

    return this;
  }

  /**
   * Underline text
   *
   * @param  {boolean|number}   value  true to turn on underline, false to turn off, or 2 for double underline
   * @return {object}                  Return the object, for easy chaining commands
   *
   */
  underline(value) {
    if (typeof value === 'undefined') {
      value = !this._state.underline;
    }

    this._state.underline = value;

    this._queue([0x1b, 0x2d, Number(value)]);

    return this;
  }

  /**
   * Italic text
   *
   * @param  {boolean}          value  true to turn on italic, false to turn off
   * @return {object}                  Return the object, for easy chaining commands
   *
   */
  italic(value) {
    if (typeof value === 'undefined') {
      value = !this._state.italic;
    }

    this._state.italic = value;

    this._queue([0x1b, 0x34, Number(value)]);

    return this;
  }

  /**
   * Bold text
   *
   * @param  {boolean}          value  true to turn on bold, false to turn off
   * @return {object}                  Return the object, for easy chaining commands
   *
   */
  bold(value) {
    if (typeof value === 'undefined') {
      value = !this._state.bold;
    }

    this._state.bold = value;

    this._queue([0x1b, value ? 0x42 : 0x62]);

    return this;
  }

  /**
   * Change width of text
   *
   * @param  {number}          width    The width of the text, 1 - 8
   * @return {object}                   Return the object, for easy chaining commands
   *
   */
  width(width) {
    if (typeof width === 'undefined') {
      width = 1;
    }

    if (typeof width !== 'number') {
      throw new Error('Width must be a number');
    }

    if (width < 1 || width > 8) {
      throw new Error('Width must be between 1 and 8');
    }

    this._state.width = width;

    this._queue([
      0x1d,
      0x21,
      (this._state.height - 1) | ((this._state.width - 1) << 4),
    ]);

    return this;
  }

  /**
   * Change height of text
   *
   * @param  {number}          height  The height of the text, 1 - 8
   * @return {object}                  Return the object, for easy chaining commands
   *
   */
  height(height) {
    if (typeof height === 'undefined') {
      height = 1;
    }

    if (typeof height !== 'number') {
      throw new Error('Height must be a number');
    }

    if (height < 1 || height > 8) {
      throw new Error('Height must be between 1 and 8');
    }

    this._state.height = height;

    this._queue([
      0x1d,
      0x21,
      (this._state.height - 1) | ((this._state.width - 1) << 4),
    ]);

    return this;
  }

  /**
   * Invert text
   *
   * @param  {boolean}          value  true to turn on white text on black, false to turn off
   * @return {object}                  Return the object, for easy chaining commands
   *
   */
  invert(value) {
    if (typeof value === 'undefined') {
      value = !this._state.invert;
    }

    this._state.invert = value;

    this._queue([0x1d, 0x42, Number(value)]);

    return this;
  }

  /**
   * Change text size
   *
   * @param  {string}          value   small or normal
   * @return {object}                  Return the object, for easy chaining commands
   *
   */
  size(value) {
    if (value === 'small') {
      value = 0x01;
    } else {
      value = 0x00;
    }

    this._queue([0x1b, 0x4d, value]);

    return this;
  }

  /**
   * Change text alignment
   *
   * @param  {string}          value   left, center or right
   * @return {object}                  Return the object, for easy chaining commands
   *
   */
  align(value) {
    const alignments = {
      left: 0x63,
      center: 0x43,
    };

    if (value in alignments) {
      this._state.align = value;

      if (!this._embedded) {
        this._queue([0x1b, alignments[value]]);
      }
    } else {
      throw new Error('Unknown alignment');
    }

    return this;
  }

  /**
   * Print  table   with End Of Line
   *
   * @param  {[List]}  data  [mandatory]
   * @param  {[String]}  encoding [optional]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  table(data) {
    const cellWidth = 40 / data.length;
    let lineTxt = '';

    for (let i = 0; i < data.length; i += 1) {
      lineTxt += data[i].toString();

      const spaces = cellWidth - data[i].toString().length;
      for (let j = 0; j < spaces; j += 1) {
        lineTxt += ' ';
      }
    }

    const bytes = this._encode(lineTxt);

    this._queue([bytes]);

    return this;
  }

  /**
   * Barcode
   *
   * @param  {string}           value  the value of the barcode
   * @param  {string}           symbology  the type of the barcode
   * @param  {number}           height  height of the barcode
   * @return {object}                  Return the object, for easy chaining commands
   *
   */
  barcode(value, symbology, height) {
    if (this._embedded) {
      throw new Error('Barcodes are not supported in table cells or boxes');
    }

    const symbologies = {
      upca: 0x00,
      upce: 0x01,
      ean13: 0x02,
      ean8: 0x03,
      code39: 0x04,
      coda39: 0x04 /* typo, leave here for backwards compatibility */,
      itf: 0x05,
      codabar: 0x06,
      code93: 0x48,
      code128: 0x49,
      'gs1-128': 0x50,
      'gs1-databar-omni': 0x51,
      'gs1-databar-truncated': 0x52,
      'gs1-databar-limited': 0x53,
      'gs1-databar-expanded': 0x54,
      'code128-auto': 0x55,
    };

    if (symbology in symbologies) {
      const bytes = Buffer.from(value, 'ascii');

      if (this._cursor != 0) {
        this.newline();
      }

      this._queue([
        0x1d,
        0x68,
        height,
        0x1d,
        0x77,
        symbology === 'code39' ? 0x02 : 0x03,
      ]);

      if (symbology == 'code128' && bytes[0] !== 0x7b) {
        /* Not yet encodeded Code 128, assume data is Code B, which is similar to ASCII without control chars */

        this._queue([
          0x1d,
          0x6b,
          symbologies[symbology],
          bytes.length + 2,
          0x7b,
          0x42,
          bytes,
        ]);
      } else if (symbologies[symbology] > 0x40) {
        /* Function B symbologies */

        this._queue([0x1d, 0x6b, symbologies[symbology], bytes.length, bytes]);
      } else {
        /* Function A symbologies */

        this._queue([0x1d, 0x6b, symbologies[symbology], bytes, 0x00]);
      }
    } else {
      throw new Error('Symbology not supported by printer');
    }

    this._flush();

    return this;
  }

  /**
   * QR code
   *
   * @param  {string}           value  the value of the qr code
   * @param  {number}           model  model of the qrcode, either 1 or 2
   * @param  {number}           size   size of the qrcode, a value between 1 and 8
   * @param  {string}           errorlevel  the amount of error correction used, either 'l', 'm', 'q', 'h'
   * @return {object}                  Return the object, for easy chaining commands
   *
   */
  qrcode(value, model, size) {
    if (this._embedded) {
      throw new Error('QR codes are not supported in table cells or boxes');
    }

    /* Force printing the print buffer and moving to a new line */

    this._queue([0x1b, 0x71]);

    /* Size */
    // The range is 1 to 8 (0x31 to 0x38).

    if (typeof size === 'undefined' || size === 0) {
      size = 6;
    }

    if (typeof size !== 'number') {
      throw new Error('Size must be a number');
    }

    if (size < 1 || size > 8) {
      throw new Error('Size must be between 1 and 8');
    }

    this._queue([0x30 + size]);

    /* Starting Position */
    // The range is 0 to 60 (0x20 to 0x5C).
    this._queue([0x20]);
    // this._queue([0x20 + Math.round((60 - size * 4) / 2)])

    /* Data */

    const bytes = Buffer.from(value, 'ascii');
    const length = bytes.length;

    let len1 = 0x20;
    let len2 = 0x20;

    const multiplier = Math.floor(length / 95);

    len1 += multiplier;
    len2 += length % 95;

    this._queue([len1, len2, bytes]);

    this._flush();

    return this;
  }

  /**
   * Cut paper
   *
   * @param  {string}          value   full or partial. When not specified a full cut will be assumed
   * @return {object}                  Return the object, for easy chaining commands
   *
   */
  cut() {
    if (this._embedded) {
        throw new Error('Cut is not supported in table cells or boxes');
    }

    // WARNING: for RPU pritner thre is separate command for cutting paper

    return this;
  }

  /**
   * Add raw printer commands
   *
   * @param  {array}           data   raw bytes to be included
   * @return {object}          Return the object, for easy chaining commands
   *
   */
  raw(data) {
    this._queue(data);

    return this;
  }

  /**
   * Encode all previous commands
   *
   * @return {Uint8Array}         Return the encoded bytes
   *
   */
  encode() {
    this._flush();

    let length = 0;

    this._buffer.forEach((item) => {
      if (typeof item === 'number') {
        length++;
      } else {
        length += item.length;
      }
    });

    const result = new Uint8Array(length);

    let index = 0;

    this._buffer.forEach((item) => {
      if (typeof item === 'number') {
        result[index] = item;
        index++;
      } else {
        result.set(item, index);
        index += item.length;
      }
    });

    this._reset();

    return Buffer.from(result);
  }
}

module.exports = EscPosEncoder;
