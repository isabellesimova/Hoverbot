Vue.component('lightring-tile', {
  props: {
    title: String,
    connected: false,
    send: {
      type: Function,
      required: true,
    },
    config: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      enabled: true,
      colorSample: {
        backgroundColor: '#00FFFF',
      },
      secondColorSample: {
        backgroundColor: '#00FFFF',
      },
      isValidColor: true,
      isValidSecondColor: true,
      animationKey: '',
      animation: {},
      options: {},
    };
  },
  watch: {
    config() {
      // If the provided config is non-empty, update the options here
      if (Object.keys(this.config).length > 0) {
        // Set the internal options to the provided config
        this.options = this.config;
        // Init the animation key (and subsequently the current animation)
        this.animationKey = Object.keys(this.config)[0];
      }
    },
    animationKey() {
      this.animation = this.options[this.animationKey];
      this.onUpdate();
    },
  },
  methods: {
    onSwitch() {
      this.send('lightring_switch', {
        enabled: this.enabled,
      });
    },
    checkConfig() {
      // Check the color and update the sample color
      if (this.animation.color) {
        this.isValidColor = this.isValidHex(this.animation.color);
        this.colorSample.backgroundColor = `#${this.animation.color}`;
      }
      if (this.animation.secondColor) {
        this.isValidSecondColor = this.isValidHex(this.animation.secondColor);
        this.secondColorSample.backgroundColor = `#${this.animation.secondColor}`;
      }
      // Appaned the custom state specific animation fields
      this.animation = {
        ...this.animation,
        label: 'custom',
        timeout: 6000,
        transitions: ['*', 'custom'],
      };
    },
    isValidHex() {
      const re = /[0-9A-Fa-f]{6}/g;
      if (re.test(this.animation.color)) return true;
      return false;
    },
    onUpdate() {
      // Save the changes to the options object (so changes persist)
      this.options[this.animationKey] = this.animation;
      // Do any preliminary checks on the config
      this.checkConfig();
      // Send the custom update
      this.send('lightring_custom', { animation: this.animation });
    },
  },
  template: `<div>
    <div class="level">
      <div class="level-left"><div class="level-item"><p class="title">{{ title }}</p></div></div>
      <div class="level-right"><div class="level-item">
        <div class="field">
          <input id="lightring-switch" type="checkbox" name="lightring-switch" class="switch" v-model="enabled" :disabled="!connected" @change="onSwitch">
          <label for="lightring-switch"></label>
        </div>
      </div></div>
    </div>

    <div :class="{ 'has-text-grey-light': !enabled }">
      <p class="subtitle">Custom</p>

      <div v-if="!connected">Not connected.</div>
      <div v-else-if="Object.keys(this.options).length === 0">No configuration options provided from hoverbot.</div>

      <div v-else>
      <div class="field">
        <label class="label">Animation</label>
        <div class="control">
          <div class="select"><select v-model="animationKey" :disabled="!enabled">
              <option v-for="(value, key, index) in options" :value="key">{{ key }}</option>
            </select></div>
        </div>
      </div>

      <div class="field">
        <label class="label">Brightness</label><span>{{ animation.brightness }}</span>
        <div class="control">
          <input type="range" class="slider" v-model="animation.brightness" :disabled="!enabled" :min="animation.minBrightness" :max="animation.maxBrightness" :step=1 @change="onUpdate" style="width: 100%">
        </div>
      </div>

      <div class="field" v-if="animation.animate">
        <label class="label">Interval</label><span>{{ animation.interval }}</span>
        <div class="control">
            <input type="range" class="slider" v-model="animation.interval" :disabled="!enabled" :min="animation.minInterval" :max="animation.maxInterval" @change="onUpdate" style="width: 100%">
        </div>
      </div>

      <div class="field">
        <label class="label">Color</label>
        <div class="control">
          <input class="input" type="text" v-model="animation.color" :disabled="!enabled" placeholder="00FFFF" v-bind:style="colorSample" maxlength="6" @change="onUpdate">
        </div>
        <p v-if="!isValidColor" class="help is-danger">Invalid hex color! Please provide a valid hex string (with no leading special characters).</p>
      </div>

      <div class="field" v-if="animation.secondColor">
        <label class="label">Second Color</label>
        <div class="control">
          <input class="input" type="text" v-model="animation.secondColor" :disabled="!enabled" placeholder="00FFFF" v-bind:style="secondColorSample" maxlength="6" @change="onUpdate">
        </div>
        <p v-if="!isValidColor" class="help is-danger">Invalid hex color! Please provide a valid hex string (with no leading special characters).</p>
      </div>

      </div>

    </div>
  </div>`,
});
