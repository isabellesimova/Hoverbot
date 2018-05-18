Vue.component('status-tile', {
  props: {
    title: String,
    data: Object,
  },
  data() {
    return {
      statuses: [
        {
          status: 0,
          success: 'Good parsing',
          failure: 'Bad parsing',
        },
        {
          status: 0,
          success: 'Speed in bounds',
          failure: 'Speed out of bounds',
        },
        {
          status: 0,
          success: 'Heartbeat ok',
          failure: 'Heartbeat missing',
        },
        {
          status: 0,
          success: 'Power ok',
          failure: 'Max power reached',
        },
        {
          status: 0,
          success: 'Battery ok',
          failure: 'Low battery',
        },
        {
          status: 0,
          success: 'Not charging',
          failure: 'Is charging',
        },
      ],
    };
  },
  watch: {
    data() {
      const statusByte = this.data.status;
      for (let i = 0; i < this.statuses.length; i += 1) {
        this.statuses[i].status = (statusByte >> i) & 1; // eslint-disable-line no-bitwise
      }
    },
  },
  template: `<div>

    <div class="level">
      <div class="level-left"><div class="level-item"><p class="title">{{ title }}</p></div></div>
    </div>

    <div v-for="status_obj in statuses" style="padding-bottom:10px">
      <div class="level"><div class="level-left">
        <div class="level-item" v-if="status_obj.status"><div class="icon has-background-danger"></div></div>
        <div class="level-item" v-else><div class="icon has-background-success"></div></div>
        <div class="level-item">{{ status_obj.status ? status_obj.failure : status_obj.success }}</div>
      </div></div>
    </div>

    </div>`,
});
