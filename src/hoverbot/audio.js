const Player = require('play-sound');
const Mic = require('mic');
const speak = require('simple-tts');
const logger = require('winston');

module.exports = class Audio {
  constructor() {
    // this.player = new Player({ player: 'play' }); // needed to work on ubuntu
    this.player = new Player();
    this.mic = new Mic({
      rate: '16000',
      channels: '1',
      device: 'hw:1,0',
      fileType: 'wav',
    });
    this.micInputStream = this.mic.getAudioStream();
    // This will automatically start streaming the mic, but we already do that with video so /shrug?
    this.mic.start();
  }

  tts(text) {
    if (text) {
      // TODO: determine if we can use the streaming interface rather than create mp3s
      speak(text, { lang: 'en', format: 'mp3', filename: 'tts' });
      const audio = this.player.play('tts.mp3', (err) => {
        if (err) {
          logger.error(err);
          audio.kill();
        }
      });
    }
  }

  getMicStream() {
    return this.micInputStream;
  }

  // TODO: add beeps and such
};
