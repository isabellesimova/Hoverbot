Vue.component('message-tile', {
  props: {
    title: String,
    message: Object,
  },
  data() {
    return {
      topics: [],
      filters: [],
      msgs: [],
      filteredMsgs: [],
      paused: false,
      action: 'pause',
      bufferSize: 20,
      numMessages: 10,
    };
  },
  watch: {
    paused() {
      this.action = this.paused ? 'resume' : 'pause';
    },
    message() {
      // Add topic to available filters
      if (!this.topics.includes(this.message.topic)) {
        this.topics.push(this.message.topic);
        this.filters.push(this.message.topic);
      }
      // Update the list
      if (!this.paused) {
        const len = this.msgs.unshift(this.message);
        if (len > this.bufferSize) this.msgs.pop();
        this.filteredMsgs = this.filterMessages();
      }
    },
  },
  methods: {
    filterMessages() {
      // Filter all messages and return the most recent numMessages
      return this.msgs.filter(msg => this.filters.includes(msg.topic)).slice(0, this.numMessages);
    },
    toggleFilter(topic) {
      const index = this.filters.indexOf(topic);
      if (index !== -1) this.filters.splice(index, 1);
      else this.filters.push(topic);
      this.filteredMsgs = this.filterMessages();
    },
  },
  template: `<div>

    <div class="level">
      <div class="level-left"><div class="level-item"><p class="title">{{ title }}</p></div></div>
      <div class="level-right"><div class="level-item">
        <span class="button" v-on:click="paused=!paused" :class="{ 'is-warning' : paused }">{{ action }}</span>
      </div></div>
    </div>

    <div class="buttons">
      <span v-for="t in topics" class="button" v-on:click="toggleFilter(t)" :class="{ 'is-info' : filters.includes(t) }">{{ t }}</span>
    </div>

    <div v-for="(m, index) in filteredMsgs">
      <div class="content level" :class="{ 'has-text-weight-bold' : index === 0 }">
        <div class="level-left" :class="{ 'has-text-grey-light' : index === (numMessages - 1) }">
          <div class="level-item"><p>{{ (new Date(m.timestamp)).toLocaleString() }}</p></div>
          <div class="level-item"><p>{{ m.topic }}</p></div>
          <div id="message" class="level-item"><p>{{ m.data }}</p></div>
        </div>
      </div>
    </div>

    </div>`,
});
