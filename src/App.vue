<template>
  <view class="app-root">
    <slot />
  </view>
</template>

<style>
.app-root {
  min-height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
  font-family: "Helvetica Neue", Arial, sans-serif;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 3px;
}
</style>
