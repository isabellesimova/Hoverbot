Vue.component('dpad-tile', {
  props: {
    title: String,
    drive: {
      type: Function,
      required: true,
    },
    teleop: Boolean,
    response: Boolean,
  },
  data() {
    return {
      settings: {
        speedMin: 0,
        speedMax: 120,
        speedStep: 1,
      },
      driveMessage: {
        speed: 20,
        ArrowLeft: false,
        ArrowRight: false,
        ArrowUp: false,
        ArrowDown: false,
      },
    };
  },
  computed: {
    isActive() {
      if (this.driveMessage.ArrowUp) return true;
      if (this.driveMessage.ArrowLeft) return true;
      if (this.driveMessage.ArrowRight) return true;
      if (this.driveMessage.ArrowDown) return true;
      return false;
    },
  },
  created() {
    document.addEventListener('keydown', (e) => {
      // Only use arrow keys for dpad if no other element is active
      if (document.activeElement !== document.body) return;
      // Check for arrow keycode (ArrowLeft = 37, ArrowUp = 38, ArrowRight = 39, ArrowDown = 40)
      if (e.keyCode >= 37 && e.keyCode <= 40) {
        e.preventDefault();
        this.onDpad(e.key);
      }
    });
    document.addEventListener('keyup', (e) => {
      // Only use arrow keys for dpad if no other element is active
      if (document.activeElement !== document.body) return;
      // Check for arrow keycode (ArrowLeft = 37, ArrowUp = 38, ArrowRight = 39, ArrowDown = 40)
      if (e.keyCode >= 37 && e.keyCode <= 40) {
        e.preventDefault();
        this.onRelease(e.key);
      }
    });
  },
  methods: {
    onDpad(key) {
      if (!(key in this.driveMessage)) return;
      // If the key is not yet marked as fired, update the drive message and fire the drive event
      if (!this.driveMessage[key]) {
        this.driveMessage[key] = true;
        this.drive('dpad', this.driveMessage);
      }
    },
    onRelease(key) {
      if (!(key in this.driveMessage)) return;
      // Update the drive message
      this.driveMessage[key] = false;
      // If the dpad is still active, send the updated drive message
      // Otherwise, send the stop message
      if (this.isActive) {
        this.drive('dpad', this.driveMessage);
      } else {
        this.drive('stop', {});
      }
    },
  },
  template: `<div>
    <div class="title">
      <span>{{ title }}</span>
      <span v-if="teleop && response" class="tag is-success">teleop control</span>
      <span v-else-if="!teleop && response" class="tag is-warning">robot busy</span>
      <span v-else class="tag is-info">pending</span>
    </div>
    <div class="columns">
      <div id="dpad-container" class="column">
          <div>
              <button ref="up" class="button circle-button is-primary" @mousedown="onDpad('ArrowUp')" @mouseup="onRelease('ArrowUp')" style="margin: 10px">
                  <svg fill="#FFFFFF" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 0h24v24H0V0z" fill="none"/>
                      <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
                  </svg>
              </button>
          </div>
          <div>
              <button ref="left" class="button circle-button is-primary" @mousedown="onDpad('ArrowLeft')" @mouseup="onRelease('ArrowLeft')" style="margin-right: 25px">
                  <svg fill="#FFFFFF" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 0h24v24H0z" fill="none"/>
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                  </svg>
              </button>
              <button ref="right" class="button circle-button is-primary" @mousedown="onDpad('ArrowRight')" @mouseup="onRelease('ArrowRight')" style="margin-left: 25px">
                  <svg fill="#FFFFFF" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 0h24v24H0z" fill="none"/>
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                  </svg>
              </button>
          </div>
          <div>
              <button ref="down" class="button circle-button is-primary" @mousedown="onDpad('ArrowDown')" @mouseup="onRelease('ArrowDown')" style="margin: 10px">
                <svg fill="#FFFFFF" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0h24v24H0V0z" fill="none"/>
                    <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/>
                </svg>
              </button>
          </div>

      </div>
      <div class="column">
        <div class="level"><div class="level-item"><h1 class="subtitle is-1">{{ driveMessage.speed }}</h1></div></div>
        <div class="level"><div class="level-item"><input type="range" class="slider" v-model="driveMessage.speed" :min="settings.speedMin" :max="settings.speedMax" :step="settings.speedStep"></div></div>
        <div class="level"><div class="level-item"><h6 class="subtitle is-6">drive speed</h6></div></div>
      </div>
    </div>
    </div>`,
});
