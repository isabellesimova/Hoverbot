Vue.component('camera-tile', {
  props: {
    src: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      default: 'camera stream',
    },
    timeout: {
      type: Number,
      default: 2,
    },
    title: {
      type: String,
      default: 'webcam',
    },
  },
  data() {
    return {
      loading: true,
      success: false,
      timeoutExpired: false,
      loadingMessage: 'loading...',
      errorMessage: 'Error loading camera stream',
      isFlipped: false,
    };
  },
  mounted() {
    const image = this.$refs.image;
    this.loading = true;
    image.onload = () => {
      this.loading = false;
      this.success = true;
    };
    image.onerror = () => {
      this.loading = false;
      this.success = false;
    };
    image.onabort = () => {
      this.loading = false;
      this.success = false;
    };
  },
  template: `<div>
      <div>
        <p class="subtitle" v-if="loading">{{ loadingMessage }}</p>
        <p class="subtitle" v-if="!loading && !success">{{ errorMessage }}</p>
      </div>
      <figure class="image">
      <img ref="image"
        v-bind='{"src":src,"alt":alt}'
        v-bind:class="{ flipped: isFlipped }"
        v-on:click="isFlipped = !isFlipped"
        v-show="!loading && success">
      </figure>
    </div>`,
});
