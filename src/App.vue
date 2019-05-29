<template>
  <div id="app">
    <Field ref="gameField" />
  </div>
</template>

<script>
import Field from './components/Field.vue';

export default {
  name: 'app',
  components: {
    Field,
  },
  methods: {
  },
  created: function () {
    window.addEventListener('keydown', e => this.$refs.gameField.onKeyPress(e));
    window.addEventListener('beforeunload', () => this.$refs.gameField.onWindowClose());
  },
};
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
