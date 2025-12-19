<template>
  <view
    v-if="visible"
    class="floating-card"
    :style="cardStyle"
    @touchstart.stop="onTouchStart"
    @touchmove.stop.prevent="onTouchMove"
  >
    <view class="floating-header">
      <text class="title">悬浮字幕</text>
      <view class="actions">
        <view class="badge" :class="{ success: isLive }">
          {{ isLive ? '直播中' : '待机' }}
        </view>
        <button class="mini-btn" size="mini" @click.stop="emitToggle">收起</button>
      </view>
    </view>
    <scroll-view class="scroll-area" :scroll-y="true">
      <view v-if="!messages.length" class="empty">
        暂无内容，等待识别...
      </view>
      <view v-for="item in messages" :key="item.id" class="row">
        <text class="lang">{{ item.language.toUpperCase() }}</text>
        <text class="text">{{ item.text }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { computed, reactive } from 'vue'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  visible: {
    type: Boolean,
    default: true
  },
  isLive: {
    type: Boolean,
    default: false
  }
})

const emits = defineEmits(['toggle'])

const position = reactive({
  x: 16,
  y: 120
})

const start = reactive({
  x: 0,
  y: 0
})

const cardStyle = computed(() => {
  return `transform: translate(${position.x}px, ${position.y}px);`
})

function emitToggle() {
  emits('toggle')
}

function onTouchStart(event) {
  const touch = event.changedTouches?.[0]
  if (!touch) return
  start.x = touch.pageX - position.x
  start.y = touch.pageY - position.y
}

function onTouchMove(event) {
  const touch = event.changedTouches?.[0]
  if (!touch) return
  position.x = touch.pageX - start.x
  position.y = touch.pageY - start.y
}
</script>

<style scoped>
.floating-card {
  position: fixed;
  top: 0;
  left: 0;
  width: 320rpx;
  max-height: 60vh;
  background: rgba(30, 41, 59, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 16rpx;
  box-shadow: 0 16rpx 60rpx rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(12rpx);
  overflow: hidden;
  z-index: 9999;
}

.floating-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 16rpx;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.title {
  color: #e2e8f0;
  font-weight: 600;
  font-size: 28rpx;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.badge {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
  font-size: 24rpx;
}

.badge.success {
  background: rgba(52, 211, 153, 0.18);
  color: #34d399;
}

.mini-btn {
  background: rgba(148, 163, 184, 0.15);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.scroll-area {
  max-height: 50vh;
  padding: 12rpx;
}

.row {
  display: flex;
  gap: 12rpx;
  padding: 10rpx 12rpx;
  margin-bottom: 8rpx;
  background: rgba(15, 23, 42, 0.3);
  border-radius: 12rpx;
}

.lang {
  color: #a5b4fc;
  font-weight: 600;
}

.text {
  color: #e2e8f0;
}

.empty {
  text-align: center;
  color: #cbd5e1;
  padding: 32rpx 0;
}
</style>
