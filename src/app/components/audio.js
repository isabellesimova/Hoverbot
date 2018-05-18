Vue.component('audio-tile', {
  props: {
    title: {
      type: String,
      default: 'Audio',
    },
    src: {
      type: String,
      required: true,
    },
    send: {
      type: Function,
      required: true,
    },
    stream: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      ttsText: '',
    };
  },
  methods: {
    onTTS() {
      if (this.ttsText !== '') {
        this.send('tts', { tts: this.ttsText });
      }
    },
  },
  template: `<div>
    <p class="title">{{ title }}</p>
    <div v-if="stream.active"><audio :src="src" type="audio/wav" controls></audio></div>
    <div class="level"><div class="level-left"><div class="level-item"><div class="field has-addons">
          <p class="control"><input class="input" type="text" v-model="ttsText" placeholder="Hello, world!"></p>
          <p class="control"><button v-on:click="onTTS" class="button is-primary">Text-to-Speech</button></p>
    </div></div></div></div>
    </div>`,
});
