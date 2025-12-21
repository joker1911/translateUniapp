<template>
  <view class="page">
    <view class="hero">
      <view class="title-area">
        <text class="eyebrow">视频 · 双语字幕 · 查词</text>
        <text class="title">学习型播放器</text>
        <text class="subtitle">
          支持点击字幕跳转、当前字幕自动高亮滚动，单词查词弹窗，以及原文+译文双语显示。
        </text>
      </view>
      <view class="cta">
        <button class="primary" type="primary" @click="reloadSubtitles" :loading="loading">
          重新加载字幕
        </button>
        <button class="ghost" @click="toggleTranslation">
          {{ showTranslation ? '隐藏中文' : '显示中文' }}
        </button>
      </view>
    </view>

    <view class="layout">
      <view class="card player-card">
        <video
          id="study-player"
          class="player"
          :src="videoUrl"
          controls
          show-progress
          :enable-play-gesture="true"
          @timeupdate="handleTimeUpdate"
          @ended="handleEnded"
        ></video>
        <view class="player-meta">
          <view class="meta-item">
            <text class="label">当前时间</text>
            <text class="value">{{ (currentTime / 1000).toFixed(1) }} s</text>
          </view>
          <view class="meta-item">
            <text class="label">当前字幕</text>
            <text class="value">#{{ currentCue?.id ?? '-' }}</text>
          </view>
          <view class="meta-item">
            <text class="label">字幕数量</text>
            <text class="value">{{ cues.length }}</text>
          </view>
        </view>
      </view>

      <view class="card subtitle-card">
        <view class="card-header">
          <text class="card-title">互动字幕</text>
          <text class="desc">点击行跳转，单词可查词</text>
        </view>
        <scroll-view
          class="subtitle-list"
          scroll-y
          :scroll-into-view="scrollIntoViewId"
          scroll-with-animation
        >
          <view v-if="!cues.length" class="empty">正在加载字幕...</view>
          <view
            v-for="(cue, index) in cues"
            :id="`cue-${cue.id}`"
            :key="cue.id"
            class="cue-row"
            :class="{ active: index === currentCueIndex }"
            @click="jumpToCue(cue)"
          >
            <view class="cue-time">{{ formatTime(cue.startMs) }} - {{ formatTime(cue.endMs) }}</view>
            <view class="cue-text">
              <template v-for="(token, tIndex) in cue.tokens" :key="`${cue.id}-${tIndex}`">
                <text
                  v-if="token.norm"
                  class="token"
                  @click.stop="onWordClick(token.norm, cue, $event)"
                >
                  {{ token.t }}
                </text>
                <text v-else>{{ token.t }}</text>
              </template>
              <text v-if="!cue.tokens?.length">{{ cue.text }}</text>
            </view>
            <view v-if="showTranslation && cue.translation" class="cue-translation">{{ cue.translation }}</view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-if="dictPopup.visible" class="dict-popup" :style="popupStyle">
      <view class="dict-header">
        <text class="dict-term">{{ dictPopup.data?.term }}</text>
        <text v-if="dictPopup.data?.phonetic" class="dict-phonetic">/{{ dictPopup.data.phonetic }}/</text>
        <button class="mini-btn" size="mini" @click="closePopup">关闭</button>
      </view>
      <view v-if="dictPopup.data?.pos?.length" class="dict-body">
        <view v-for="(item, idx) in dictPopup.data.pos" :key="idx" class="dict-pos">
          <text class="pos-type">{{ item.type }}</text>
          <text class="pos-meaning">{{ item.meaning }}</text>
        </view>
      </view>
      <view v-if="dictPopup.data?.examples?.length" class="dict-examples">
        <view v-for="(ex, idx) in dictPopup.data.examples" :key="`ex-${idx}`" class="dict-example">
          <text class="ex-en">{{ ex.en }}</text>
          <text class="ex-zh">{{ ex.zh }}</text>
        </view>
      </view>
      <view v-if="dictPopup.data?.message" class="dict-message">{{ dictPopup.data.message }}</view>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { fetchSubtitles, lookupDictionary, translateMissingCues } from '@/services/media'

const videoId = ref('demo-video')
const videoUrl = ref('https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4')
const cues = ref([])
const currentCueIndex = ref(-1)
const currentTime = ref(0)
const scrollIntoViewId = ref('')
const showTranslation = ref(true)
const loading = ref(false)
const videoContext = ref(null)
const dictPopup = ref({ visible: false, x: 20, y: 20, data: null })

const currentCue = computed(() => (currentCueIndex.value >= 0 ? cues.value[currentCueIndex.value] : null))

onMounted(async () => {
  videoContext.value = uni.createVideoContext('study-player')
  await reloadSubtitles()
})

watch(currentCueIndex, (val, oldVal) => {
  if (val === oldVal || val < 0) return
  scrollIntoViewId.value = `cue-${cues.value[val].id}`
})

async function reloadSubtitles() {
  loading.value = true
  try {
    const baseCues = await fetchSubtitles(videoId.value, 'en', 'zh')
    const withTranslation = await translateMissingCues(videoId.value, baseCues, 'en', 'zh')
    cues.value = withTranslation
  } finally {
    loading.value = false
    await nextTick()
    currentCueIndex.value = -1
  }
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const milli = Math.floor((ms % 1000) / 10)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milli).padStart(2, '0')}`
}

function findCueIndex(timeMs) {
  let left = 0
  let right = cues.value.length - 1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const cue = cues.value[mid]
    if (timeMs < cue.startMs) {
      right = mid - 1
    } else if (timeMs >= cue.endMs) {
      left = mid + 1
    } else {
      return mid
    }
  }

  return -1
}

function updateActiveCue(timeMs) {
  const idx = findCueIndex(timeMs)
  if (idx !== currentCueIndex.value) {
    currentCueIndex.value = idx
  }
}

function handleTimeUpdate(event) {
  const timeMs = Math.floor(event.detail.currentTime * 1000)
  currentTime.value = timeMs
  updateActiveCue(timeMs)
}

function handleEnded() {
  currentCueIndex.value = -1
}

function jumpToCue(cue) {
  if (!videoContext.value || !cue) return
  const seconds = cue.startMs / 1000
  videoContext.value.seek(seconds)
}

function toggleTranslation() {
  showTranslation.value = !showTranslation.value
}

async function onWordClick(term, cue, event) {
  if (!term) return
  const touch = event?.detail || event?.touches?.[0] || {}
  const position = {
    x: touch.x || touch.pageX || 20,
    y: touch.y || touch.pageY || 20
  }

  const data = await lookupDictionary(term, cue.lang || 'en', 'zh')
  dictPopup.value = {
    visible: true,
    x: position.x,
    y: position.y,
    data
  }
}

function closePopup() {
  dictPopup.value = { visible: false, x: 0, y: 0, data: null }
}

const popupStyle = computed(() => {
  return `top: ${dictPopup.value.y + 10}px; left: ${dictPopup.value.x + 10}px;`
})
</script>

<style scoped>
.page {
  padding: 32rpx;
  background: linear-gradient(180deg, #0f172a 0%, #111827 60%, #0b1220 100%);
  min-height: 100vh;
  box-sizing: border-box;
  color: #e2e8f0;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  flex-wrap: wrap;
  margin-bottom: 24rpx;
}

.title-area {
  max-width: 70%;
}

.eyebrow {
  color: #a5b4fc;
  font-size: 26rpx;
  letter-spacing: 6rpx;
}

.title {
  display: block;
  font-size: 56rpx;
  font-weight: 800;
  color: #e2e8f0;
  margin: 6rpx 0 12rpx;
}

.subtitle {
  color: #cbd5e1;
  font-size: 28rpx;
  line-height: 1.6;
}

.cta {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
}

.layout {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 20rpx;
}

.card {
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18rpx;
  padding: 20rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.35);
}

.player-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.player {
  width: 100%;
  border-radius: 12rpx;
  overflow: hidden;
}

.player-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.meta-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14rpx;
  padding: 12rpx;
}

.label {
  color: #94a3b8;
  font-size: 24rpx;
}

.value {
  display: block;
  color: #e2e8f0;
  font-size: 30rpx;
  margin-top: 6rpx;
}

.subtitle-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.card-title {
  color: #e2e8f0;
  font-size: 34rpx;
  font-weight: 700;
}

.desc {
  color: #94a3b8;
  font-size: 26rpx;
}

.subtitle-list {
  max-height: 700rpx;
}

.cue-row {
  padding: 14rpx;
  border-radius: 12rpx;
  margin-bottom: 10rpx;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.02);
}

.cue-row.active {
  border-color: rgba(94, 234, 212, 0.5);
  box-shadow: 0 0 0 2rpx rgba(94, 234, 212, 0.25);
  background: rgba(94, 234, 212, 0.05);
}

.cue-time {
  color: #94a3b8;
  font-size: 24rpx;
  margin-bottom: 6rpx;
}

.cue-text {
  color: #e2e8f0;
  font-size: 30rpx;
  line-height: 1.55;
  flex-wrap: wrap;
}

.token {
  color: #cbd5ff;
  padding: 2rpx 6rpx;
  border-radius: 6rpx;
}

.token:active {
  background: rgba(148, 163, 184, 0.2);
}

.cue-translation {
  color: #cbd5e1;
  margin-top: 8rpx;
  font-size: 28rpx;
}

.empty {
  color: #94a3b8;
  text-align: center;
  padding: 32rpx 0;
}

.primary {
  background: linear-gradient(90deg, #6366f1, #22d3ee);
  color: #0b1220;
  border: none;
}

.ghost {
  background: rgba(148, 163, 184, 0.15);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.dict-popup {
  position: fixed;
  min-width: 280rpx;
  max-width: 70vw;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 14rpx;
  padding: 14rpx;
  box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.45);
  z-index: 9999;
}

.dict-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 10rpx;
}

.dict-term {
  font-weight: 700;
  font-size: 32rpx;
  color: #e2e8f0;
}

.dict-phonetic {
  color: #a5b4fc;
}

.mini-btn {
  margin-left: auto;
  background: rgba(148, 163, 184, 0.15);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.dict-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.dict-pos {
  display: flex;
  gap: 10rpx;
  align-items: baseline;
}

.pos-type {
  color: #34d399;
  font-weight: 600;
}

.pos-meaning {
  color: #e2e8f0;
}

.dict-examples {
  margin-top: 8rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.dict-example .ex-en {
  color: #cbd5ff;
}

.dict-example .ex-zh {
  color: #94a3b8;
  font-size: 26rpx;
}

.dict-message {
  color: #fbbf24;
  margin-top: 8rpx;
}

@media (max-width: 700px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .title-area {
    max-width: 100%;
  }

  .cta {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
