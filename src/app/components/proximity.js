Vue.component('proximity-tile', {
  props: {
    title: String,
    data: Object,
  },
  data() {
    return {
      width: 300,
      height: 300,
      context: null,
      radius: 80,
      angle: Math.PI / 4,
      minObstacleDistance: 0,
      maxObstacleDistance: 15,
      sensorAngle: Math.PI / 4, // Approx. angle of left/right sensors relative to center sensor
      sensorRadius: 5,
      left: {},
      center: {},
      right: {},
      rear: {},
    };
  },
  watch: {
    data() {
      this.clear();
      if ('left' in this.data) {
        this.showObstacle(this.left, this.data.left);
      }
      if ('center' in this.data) {
        this.showObstacle(this.center, this.data.center);
      }
      if ('right' in this.data) {
        this.showObstacle(this.right, this.data.right);
      }
      if ('rear' in this.data) {
        this.showObstacle(this.rear, this.data.rear);
      }
      this.draw();
    },
  },
  mounted() {
    // Initialize canvas context
    this.context = this.$refs['sensor-canvas'].getContext('2d');
    this.$refs['sensor-canvas'].width = this.width;
    this.$refs['sensor-canvas'].height = this.height;
    this.context.translate(this.width / 2, this.height / 2);

    // Triangulate approximate position of sensors along perimeter relative to center of robot
    const y = this.radius * Math.sin(this.sensorAngle);
    const x = Math.sqrt((this.radius * this.radius) - (y * y));
    this.left = {
      x: -x,
      y: -y,
      r: this.sensorRadius,
      start: Math.PI,
      end: 1.5 * Math.PI,
      color: 'black',
    };
    this.right = {
      x,
      y: -y,
      r: this.sensorRadius,
      start: 1.5 * Math.PI,
      end: 2 * Math.PI,
      color: 'black',
    };
    this.center = {
      x: 0,
      y: -this.radius,
      r: this.sensorRadius,
      start: 1.25 * Math.PI,
      end: 1.75 * Math.PI,
      color: 'black',
    };
    this.rear = {
      x: 0,
      y: this.radius,
      r: this.sensorRadius,
      start: 0.25 * Math.PI,
      end: 0.75 * Math.PI,
      color: 'black',
    };
    this.draw();
  },
  methods: {
    clear() {
      this.context.save();
      this.context.setTransform(1, 0, 0, 1, 0, 0);
      this.context.clearRect(0, 0, this.width, this.height);
      this.context.restore();
    },
    draw() {
      this.arc(0, 0, this.radius, 0, 2 * Math.PI, 4, 'grey');
      this.sensorDot(this.left);
      this.sensorDot(this.right);
      this.sensorDot(this.center);
      this.sensorDot(this.rear);
    },
    showObstacle(sensor, val) {
      if (val >= this.minObstacleDistance && val <= this.maxObstacleDistance) {
        const ycolor = (255 / this.maxObstacleDistance) * val;
        sensor.color = `#FF${ycolor.toString(16)}00`;
        this.sensorArc(sensor, val + 1, 3);
      } else {
        sensor.color = 'black';
      }
    },
    sensorArc(sensor, scalar, lineWidth) {
      this.arc(sensor.x, sensor.y, scalar * sensor.r, sensor.start, sensor.end, lineWidth, sensor.color); // eslint-disable-line max-len
    },
    sensorDot(sensor) {
      this.circle(sensor.x, sensor.y, sensor.r, 0, 2 * Math.PI, sensor.color);
    },
    circle(x, y, r, start, end, color) {
      this.context.fillStyle = color;
      this.context.beginPath();
      this.context.arc(x, y, r, start, end);
      this.context.fill();
    },
    arc(x, y, r, start, end, lineWidth, color) {
      this.context.lineWidth = lineWidth;
      this.context.strokeStyle = color;
      this.context.beginPath();
      this.context.arc(x, y, r, start, end);
      this.context.stroke();
    },
  },
  template: `<div>
    <p class="title">{{ title }}</p>
    <div class="level"><div class="level-item">
        <canvas ref="sensor-canvas"></canvas>
    </div></div>
  </div>`,
});
