Vue.component('status-tile', {
  props: {
    title: String,
    status: Object,
  },
  template: `<div>
    <div class="level">
      <div class="level-left"><div class="level-item"><p class="title">{{ title }}</p></div></div>
    </div>
    <div v-for="item in this.status" style="padding-bottom:10px">
      <div class="level"><div class="level-left">
        <div class="level-item" v-if="item.code"><div class="icon has-background-danger"></div></div>
        <div class="level-item" v-else><div class="icon has-background-success"></div></div>
        <div class="level-item">{{ item.code ? item.failure : item.success }}</div>
      </div></div>
    </div>
    </div>`,
});
