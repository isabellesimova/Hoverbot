new Vue({ // eslint-disable-line no-new
  el: '#app',
  data() {
    return {
      connected: false,
      ws: null,
      name: '',
      heartbeat: 450,
      audioStream: {
        active: false,
      },
      audioSrc: '/stream.wav',
      cameraSrc: `http://${window.location.hostname}:8080/`,
      message: {},
      teleop: false,
      lightringConfig: {},
      connectionResponse: false,
      proximityData: {},
      motorStatus: {},
      style: {
        fontFamily: ['Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    };
  },
  created() {
    // Initialize client <-> robot websocket
    this.ws = new WebSocket(`ws://${window.location.host}`);
    this.ws.onopen = () => {
      this.connected = true;
    };
    this.ws.onclose = () => {
      this.connected = false;
    };
    this.ws.onmessage = (event) => {
      try {
        this.message = JSON.parse(event.data);
        const topic = this.message.topic;
        const data = this.message.data;
        if (topic === 'sonar') this.proximityData = data;
        if (topic === 'motors') this.motorStatus = data;
        if (topic === 'connection') this.onConnectionResponse(data);
      } catch (e) {
        // Catch bad JSON formatting errors and log to console for debugging
        console.error(e); // eslint-disable-line no-console
      }
    };
  },
  methods: {
    onConnectionResponse(data) {
      this.connectionResponse = true;
      if (data.teleop) this.teleop = data.teleop;
      if (data.lightringConfig) this.lightringConfig = data.lightringConfig;
      if (typeof data.hasAudio === 'boolean') this.audioStream.active = data.hasAudio;
      if (data.name) {
        this.name = data.name;
        document.title = this.name;
      }
    },
    send(topic, data) {
      if (this.ws.readyState === this.ws.OPEN) {
        const msg = {};
        msg.topic = topic;
        msg.timestamp = Date.now();
        msg.data = data;
        this.ws.send(JSON.stringify(msg));
      }
    },
  },
});
