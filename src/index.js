const util = require('node:util');
const { once, EventEmitter } = require('node:events');
const Debug = require('debug');
const chalk = require('chalk');
const { SerialPort } = require('serialport');
const { PacketLengthParser } = require('@serialport/parser-packet-length');
const { encode, decode } = require('./utils');
const commands = require('./commands.list');

const ENQ = Buffer.from([0x05]);
const ACK = Buffer.from([0x06]);

const debug = Debug('rpu');

class RPUPrinter {
  constructor({ path, ...options }) {
    this.eventEmitter = new EventEmitter();

    this.processing = false;
    this.currentCommand = null;

    this.port = new SerialPort({
      path,
      baudRate: 115200,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      autoOpen: false,
      ...options,
    });

    this.openAsync = util.promisify(this.port.open.bind(this.port));
    this.drainAsync = util.promisify(this.port.drain.bind(this.port));

    const parser = this.port.pipe(
      new PacketLengthParser({
        delimiter: 0x02,
        packetOverhead: 5,
        lengthBytes: 2,
        lengthOffset: 1,
      })
    );

    this.port.on('open', () => {
      this.eventEmitter.emit('OPEN');
    });

    this.port.on('error', (error) => {
      this.eventEmitter.emit('error', error);
    });

    this.port.on('close', () => {
      this.eventEmitter.emit('error', new Error('Port closed'));
    });

    this.port.on('data', (buffer) => {
      debug(chalk.yellow('RX'), buffer.toString('hex'));
      if (Buffer.compare(buffer, ACK) === 0) {
        this.eventEmitter.emit('ACK');
      }
    });

    parser.on('data', (buffer) => {
      this.eventEmitter.emit('RESPONSE', buffer);
    });
  }

  async open() {
    await this.openAsync();
    return;
  }

  async writeToPort(buffer) {
    debug(chalk.green('TX'), buffer.toString('hex'));
    this.port.write(buffer);
    await this.drainAsync();
  }

  async ack() {
    try {
      await this.writeToPort(ACK);
    } catch (error) {
      // Can ignore for now
    }

    return;
  }

  async poll(skipFirst = false) {
    // Maximum number of retries allowed
    const maxRetries = 5;

    // Counter to keep track of the number of retries made
    let retries = 0;

    // Maximum time to wait for a response
    const commandTimeout = 100;

    // Time to wait between retries
    const retryInterval = 300;

    let skip = skipFirst;

    // Keep trying until the maximum number of retries is reached
    while (retries < maxRetries) {
      try {
        // Send the command to the port
        if (!skip) await this.writeToPort(ENQ);

        skip = false;

        // Wait for either an 'ACK', 'RESPONSE', or a 'TIMEOUT', whichever comes first
        const result = await Promise.race([
          // If 'ACK' event is emitted, resolve with 'ACK'
          once(this.eventEmitter, 'ACK').then(() => 'ACK'),

          // If 'RESPONSE' event is emitted, resolve with the response
          once(this.eventEmitter, 'RESPONSE').then(([response]) => response),

          // If no event is emitted within the commandTimeout duration, resolve with 'TIMEOUT'
          new Promise((resolve) =>
            setTimeout(resolve, commandTimeout, 'TIMEOUT')
          ),
        ]);

        // Handle the different possible outcomes:

        // If the device acknowledges the command, reset the retry counter
        if (result === 'ACK') {
          retries = 0;
        }
        // If the command times out, increment the retry counter
        else if (result === 'TIMEOUT') {
          retries += 1;
        }
        // If a valid response is received, return it
        else {
          await this.ack();

          return result;
        }
      } catch (error) {
        // If there's any other error (e.g., writing to the port fails), increment the retry counter
        retries += 1;
      }

      // If not all retries have been exhausted, wait for a while before the next retry
      if (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      }
    }

    // If the maximum number of retries is reached without a valid response, throw an error
    throw new Error(`COMMAND_FAILED`);
  }

  async command(name, params) {
    if (!commands[name]) {
      throw new Error('COMMAND_UNKNOWN');
    }

    if (this.processing) {
      throw new Error('PROCESSING_ANOTHER_COMMAND');
    } else {
      this.processing = true;
    }

    this.currentCommand = name;

    try {
      const data = encode(name, params);
      await this.writeToPort(data);
      const result = await this.poll(true);

      return decode(this.currentCommand, result);
    } finally {
      this.processing = false;
      this.currentCommand = null;
    }
  }
}

module.exports = RPUPrinter;
