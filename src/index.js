const Debug = require('debug');
const chalk = require('chalk');
const EventEmitter = require('events');
const { SerialPort } = require('serialport');
const { PacketLengthParser } = require('@serialport/parser-packet-length');
const fromEvents = require('promise-toolbox/fromEvents');
const { encode, decode } = require('./utils');
const commands = require('./commands.list');

const debug = Debug('rpu');

class RPUPrinter {
  constructor({ path }) {
    this.eventEmitter = new EventEmitter();

    this.processing = false;
    this.currentCommand = null;

    this.port = new SerialPort({
      path,
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      autoOpen: false,
    });

    const parser = this.port.pipe(new PacketLengthParser({
      delimiter: 0x02,
      packetOverhead: 5,
      lengthBytes: 2,
      lengthOffset: 1,
    }));

    parser.on('data', buffer => {
      debug('HOST < RPU', chalk.yellow(buffer.toString('hex')), chalk.green(this.currentCommand));
      this.eventEmitter.emit('SUCCESS', buffer);
      this.enq(false);
      this.timer(false);
      this.ack();
    });

    this.port.on('open', () => {
      this.eventEmitter.emit('OPEN');
    });

    this.port.on('error', (error) => {
      this.eventEmitter.emit('ERROR', error);
    });

    this.port.on('close', () => {
      this.eventEmitter.emit('CLOSE');
    });

    this.port.on('data', (buffer) => {
      if (buffer.length === 1 && buffer[0] === 0x06) {
        this.timer(true);
        debug('HOST < RPU', chalk.yellow(buffer.toString('hex')), chalk.green('ACK'));
      }
    });
  }

  open = () => new Promise((resolve, reject) => {
    debug('HOST > RPU', chalk.cyan('OPEN'))
    this.port.open(error => {
      if (error) reject(error);
      debug('HOST < RPU', chalk.yellow('OPENED'))
      resolve();
    });
  });

  enq = (start = true) => {
    if (start) {
      this.enqIntreval = setInterval(() => {
        debug('HOST > RPU', chalk.cyan(Buffer.from([0x05]).toString('hex')), chalk.green('ENQ'));
        this.port.write(Buffer.from([0x05]));
        this.port.drain();
      }, 300);
    } else {
      clearInterval(this.enqIntreval);
    }
  };

  ack = () => {
    debug('HOST > RPU', chalk.cyan(Buffer.from([0x06]).toString('hex')), chalk.green('ACK'));
    this.port.write(Buffer.from([0x06]));
    this.port.drain();
  };

  timer = (set = true) => {
    if (set) {
      clearTimeout(this.timeout)
      this.timeout = setTimeout(() => {
        this.eventEmitter.emit('TIMED_OUT', new Error('No response in 1s'))
      }, 1000)
    } else {
      clearTimeout(this.timeout)
    }
  }

  command = (name, params) => {
    if (!commands[name]) {
      return Promise.reject(new Error('Unknown command'));
    }

    if (this.processing) {
      return Promise.reject(new Error('Processing another command'));
    } else {
      this.processing = true;
    }

    this.currentCommand = name;

    const data = encode(name, params);
    debug('HOST > RPU', chalk.cyan(Buffer.from(data).toString('hex')), chalk.green(name));

    this.port.write(data);
    this.port.drain((error) => {
      if (error) {
        this.eventEmitter.emit('ERROR', error);
      } else {
        this.enq(true);
        this.timer(true);
      }
    });

    return new Promise((resolve, reject) => {
      fromEvents(this.eventEmitter, ['SUCCESS'], ['ERROR', 'TIMED_OUT', 'CLOSE'])
        .then(
          ({ args }) => {
            try {
              const result = decode(this.currentCommand, args.slice()[0]);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          },
        )
        .catch(({ args }) => {
          reject(args);
        })
        .finally(() => {
          this.processing = false;
          this.currentCommand = null;
        });
    });

  };
}

module.exports = RPUPrinter;
