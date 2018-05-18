Vue.component('lightring-tile', {
  props: {
    title: String,
    send: {
      type: Function,
      required: true,
    },
  },
  data() {
    return {
      enabled: true,
      animation: 'solid',
      brightness: 25,
      interval: 80,
      color: '00FFFF',
      animations: ['solid', 'flash', 'loop', 'pulse', 'scan', 'blend'],
      intervalMin: 11,
      intervalMax: 1000,
      brightnessMin: 0,
      brightnessMax: 100,
      colorSample: {
        backgroundColor: '#00FFFF',
      },
      isValidColor: true,
    };
  },
  methods: {
    onSwitch() {
      this.send('lightring_switch', {
        status: this.enabled,
      });
    },
    onUpdate() {
      // Check that input color string is a hex value
      let validColor = 'FFFFFF';
      const re = /[0-9A-Fa-f]{6}/g;
      if (re.test(this.color)) {
        validColor = this.color;
        this.isValidColor = true;
      } else {
        this.isValidColor = false;
      }
      // Update the color sample style object
      this.colorSample.backgroundColor = `#${validColor}`;
      // Send the custom update
      this.send('lightring_custom', {
        state: {
          name: 'custom_state',
          lightring: {
            animation: this.animation,
            interval: this.interval,
            brightness: this.brightness,
            color: this.color,
          },
        },
      });
    },
  },
  template: `<div>
    <div class="level">
      <div class="level-left"><div class="level-item"><p class="title">{{ title }}</p></div></div>
      <div class="level-right"><div class="level-item">
        <div class="field">
          <input id="lightring-switch" type="checkbox" name="lightring-switch" class="switch" v-model="enabled" @change="onSwitch">
          <label for="lightring-switch"></label>
        </div>
      </div></div>
    </div>
    <div :class="{ 'has-text-grey-light': !enabled }">
      <p class="subtitle">Custom</p>
      <div class="field">
        <label class="label">Animation</label>
        <div class="control">
          <div class="select"><select v-model="animation" :disabled="!enabled" @change="onUpdate">
              <option v-for="anim in animations" :value="anim">{{ anim }}</option>
            </select></div>
        </div>
      </div>
      <div class="field">
        <label class="label">Brightness</label><span>{{ brightness }}</span>
        <div class="control">
          <input type="range" class="slider" v-model="brightness" :disabled="!enabled" :min="brightnessMin" :max="brightnessMax" :step=1 @change="onUpdate" style="width: 100%">
        </div>
      </div>
      <div class="field">
        <label class="label">Interval</label><span>{{ interval }}</span>
        <div class="control">
            <input type="range" class="slider" v-model="interval" :disabled="!enabled" :min="intervalMin" :max="intervalMax" @change="onUpdate" style="width: 100%">
        </div>
      </div>
      <div class="field">
        <label class="label">Color</label>
        <div class="control">
          <input class="input" type="text" v-model="color" :disabled="!enabled" placeholder="00FFFF" v-bind:style="colorSample" maxlength="6" @change="onUpdate">
        </div>
        <p v-if="!isValidColor" class="help is-danger">Invalid hex color! Please provide a valid hex string (with no leading special characters).</p>
      </div>

    </div>
  </div>`,
});
