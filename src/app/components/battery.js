Vue.component('battery-tile', {
  props: {
    title: String,
    status: Object,
  },
  data() {
    return {
      minV: 32,
      maxV: 42,
      curV: 0,
      curPercent: 0,
      charging: 0,
    };
  },
  watch: {
    status() {
      if (this.status.charging) this.charging = this.status.charging.code;
      if (this.status.battery) this.curV = this.status.battery.voltage;
      this.curPercent = Math.round(100 * ((this.curV - this.minV) / (this.maxV - this.minV)));
      if (this.curV < this.minV) {
        this.curPercent = 0;
      } else if (this.curV > this.maxV) {
        this.curPercent = 100;
      }
      this.updateUI(this.curPercent);
    },
  },
  methods: {
    updateUI(curPercent) {
      this.$refs.battery.value = curPercent;
      if (curPercent === 100) {
        this.$refs.batteryExt.value = 100;
      } else {
        this.$refs.batteryExt.value = 0;
      }
    },
  },
  template: `<div>
      <div class="level"><div class="level-right">
        <div class="level-item" v-if="curV < minV">TOO LOW</div>
        <div class="level-item" v-else-if="curV <= maxV">{{curPercent}}%</div>
        <div class="level-item" v-else>TOO HIGH</div>
        <div class="level">
        <div class="level-left">
        <div class="level-item">
          <div>
            <progress ref="battery" v-bind:class="{
            'progress': true,
            'is-large': true,
            'is-radiusless': true,
            'is-danger':(curPercent<=30),
            'is-warning':(curPercent > 30 && curPercent<=60),
            'is-success': (curPercent > 60)}""
            value="0" max="100" style="width:50px;"></progress>
          </div>
          <span v-if="charging" class="icon is-small" style="position:absolute; text-align:center;"><i class="fas fa-bolt"></i></span>
          <div>
            <progress ref="batteryExt" class="progress is-small is-radiusless is-success" value="0" max="100" style="width:5px;"></progress>
          </div>
        </div>
        </div>
        </div>
      </div></div>

    </div>`,
});
