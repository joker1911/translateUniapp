<template>
  <view class="page">
    <view class="hero">
      <view class="title-area">
        <text class="eyebrow">UNI-APP · 实时翻译</text>
        <text class="title">通话翻译助手</text>
        <text class="subtitle">
          捕捉通话内容，自动调用可配置的翻译 API（谷歌/大模型/自定义）。支持悬浮字幕，方便跨应用查看。
        </text>
      </view>
      <view class="cta">
        <button class="primary" type="primary" @click="startListening">开始监听</button>
        <button class="ghost" @click="toggleOverlay">
          {{ overlayVisible ? '隐藏悬浮框' : '显示悬浮框' }}
        </button>
      </view>
    </view>

    <view class="grid">
      <view class="card">
        <view class="card-header">
          <text class="card-title">通话状态</text>
          <view class="tag" :class="{ online: listening }">{{ statusLabel }}</view>
        </view>
        <view class="stats">
          <view class="stat">
            <text class="label">接口状态</text>
            <text class="value">{{ connectionStatus }}</text>
          </view>
          <view class="stat">
            <text class="label">最近耗时</text>
            <text class="value">{{ latency }} ms</text>
          </view>
          <view class="stat">
            <text class="label">悬浮框</text>
            <text class="value">{{ overlayVisible ? '开启' : '关闭' }}</text>
          </view>
        </view>
        <view class="actions-row">
          <button class="primary" type="primary" @click="startListening" :disabled="listening">
            开始实时翻译
          </button>
          <button class="danger" type="warn" @click="stopListening" :disabled="!listening">
            停止
          </button>
          <button class="ghost" @click="clearHistory" :disabled="!history.length">
            清空记录
          </button>
        </view>
        <view class="input-box">
          <text class="input-label">手动输入（用于调试或未识别的语句）</text>
          <textarea
            v-model="currentInput"
            class="textarea"
            placeholder="输入一句话模拟通话内容，然后点击翻译"
            auto-height
            :maxlength="-1"
          />
          <button class="primary" type="primary" @click="handleManualTranslate">翻译文本</button>
        </view>
      </view>

      <view class="card">
        <view class="card-header">
          <text class="card-title">翻译配置</text>
          <text class="desc">可选 Google、通用 REST 或大模型接口</text>
        </view>

        <view class="form-row">
          <text class="label">提供商</text>
          <picker :value="providerIndex" :range="providerLabels" @change="handleProviderChange">
            <view class="picker">{{ providerLabels[providerIndex] }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="label">API Key</text>
          <input
            v-model="config.apiKey"
            class="input"
            placeholder="用于请求鉴权"
            type="text"
          />
        </view>

        <view class="form-row">
          <text class="label">请求地址</text>
          <input
            v-model="config.endpoint"
            class="input"
            placeholder="https://translation.googleapis.com/language/translate/v2"
            type="text"
          />
        </view>

        <view class="form-row">
          <text class="label">目标语言</text>
          <picker :value="targetIndex" :range="languageLabels" @change="handleTargetChange">
            <view class="picker">{{ languageLabels[targetIndex] }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="label">原始语言</text>
          <picker :value="sourceIndex" :range="sourceLanguageLabels" @change="handleSourceChange">
            <view class="picker">{{ sourceLanguageLabels[sourceIndex] }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="label">大模型/自定义模型名</text>
          <input
            v-model="config.model"
            class="input"
            placeholder="例如 gpt-4o-mini / llama3"
            type="text"
          />
        </view>
      </view>
    </view>

    <view class="card full">
      <view class="card-header">
        <text class="card-title">翻译记录</text>
        <text class="desc">最新 20 条通话片段</text>
      </view>
      <scroll-view class="history" :scroll-y="true">
        <view v-if="!history.length" class="empty">暂无记录，开始监听后会实时更新</view>
        <view v-for="item in history" :key="item.id" class="history-row">
          <view class="history-meta">
            <text class="badge">{{ item.language.toUpperCase() }}</text>
            <text class="time">{{ item.ts }}</text>
          </view>
          <text class="origin">{{ item.original }}</text>
          <view class="translated">
            <text class="badge ghost">{{ item.targetLanguage.toUpperCase() }}</text>
            <text class="text">{{ item.translated }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <FloatingTranscript
      :messages="overlayMessages"
      :visible="overlayVisible"
      :is-live="listening"
      @toggle="toggleOverlay"
    />
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import FloatingTranscript from '@/components/FloatingTranscript.vue'
import { translateText } from '@/services/translator'

const providers = [
  { label: 'Google 翻译 API', value: 'google', endpoint: 'https://translation.googleapis.com/language/translate/v2' },
  { label: '大模型接口', value: 'llm', endpoint: 'https://api.openai.com/v1/chat/completions' },
  { label: '自定义 REST', value: 'custom', endpoint: 'https://your.translation.endpoint' }
]

const languages = [
  { label: '自动检测', value: 'auto' },
  { label: '简体中文', value: 'zh' },
  { label: '英语', value: 'en' },
  { label: '日语', value: 'ja' },
  { label: '韩语', value: 'ko' },
  { label: '西班牙语', value: 'es' },
  { label: '法语', value: 'fr' }
]

const config = reactive({
  provider: providers[0].value,
  apiKey: '',
  endpoint: providers[0].endpoint,
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  model: 'gpt-4o-mini'
})

const history = ref([])
const listening = ref(false)
const overlayVisible = ref(true)
const connectionStatus = ref('待机')
const latency = ref(0)
const currentInput = ref('')
const providerIndex = ref(0)
const targetIndex = ref(2) // 默认英语
const sourceIndex = ref(0)
const demoTimer = ref(null)

const providerLabels = computed(() => providers.map((p) => p.label))
const languageLabels = computed(() => languages.map((l) => l.label))
const sourceLanguageLabels = computed(() => languages.map((l) => l.label))

const overlayMessages = computed(() => {
  const slice = history.value.slice(-4)
  return slice.flatMap((item) => [
    { id: `${item.id}-src`, language: item.language, text: item.original },
    { id: `${item.id}-dst`, language: item.targetLanguage, text: item.translated }
  ])
})

const statusLabel = computed(() => (listening.value ? '监听中' : '已停止'))

const demoPhrases = [
  { text: '你好，我们可以开始会议了吗？', language: 'zh' },
  { text: '这项功能需要尽快上线，我们的截止日期在周五。', language: 'zh' },
  { text: '感谢你的耐心等待，我们正在处理你的请求。', language: 'zh' }
]

function handleProviderChange(event) {
  const index = Number(event.detail.value)
  providerIndex.value = index
  const selected = providers[index]
  config.provider = selected.value
  config.endpoint = selected.endpoint
}

function handleTargetChange(event) {
  const index = Number(event.detail.value)
  targetIndex.value = index
  config.targetLanguage = languages[index].value
}

function handleSourceChange(event) {
  const index = Number(event.detail.value)
  sourceIndex.value = index
  config.sourceLanguage = languages[index].value
}

function toggleOverlay() {
  overlayVisible.value = !overlayVisible.value
}

function startListening() {
  if (listening.value) return
  listening.value = true
  connectionStatus.value = '监听中'
  playDemo()
  demoTimer.value = setInterval(playDemo, 4200)
}

function stopListening() {
  listening.value = false
  connectionStatus.value = '待机'
  if (demoTimer.value) {
    clearInterval(demoTimer.value)
    demoTimer.value = null
  }
}

function clearHistory() {
  history.value = []
}

async function handleManualTranslate() {
  if (!currentInput.value.trim()) return
  await processTranscript(currentInput.value, config.sourceLanguage || 'auto')
  currentInput.value = ''
}

async function playDemo() {
  if (!listening.value) return
  const sample = demoPhrases[Math.floor(Math.random() * demoPhrases.length)]
  await processTranscript(sample.text, sample.language)
}

async function processTranscript(text, language) {
  const start = Date.now()
  const translated = await translateText(config, text)
  latency.value = Date.now() - start
  const item = {
    id: `${Date.now()}-${Math.random()}`,
    ts: new Date().toLocaleTimeString(),
    original: text,
    translated,
    language,
    targetLanguage: config.targetLanguage
  }
  history.value = [...history.value.slice(-19), item]
}

onBeforeUnmount(() => {
  stopListening()
})
</script>

<style scoped>
.page {
  padding: 32rpx;
  background: linear-gradient(180deg, #0f172a 0%, #111827 60%, #0b1220 100%);
  min-height: 100vh;
  box-sizing: border-box;
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

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}

.card {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18rpx;
  padding: 24rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.35);
}

.card.full {
  margin-top: 24rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
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

.tag {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(248, 113, 113, 0.18);
  color: #f87171;
}

.tag.online {
  background: rgba(52, 211, 153, 0.18);
  color: #34d399;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.stat {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14rpx;
  padding: 14rpx;
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

.actions-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.primary {
  flex: 1;
  background: linear-gradient(90deg, #6366f1, #22d3ee);
  color: #0b1220;
  border: none;
}

.ghost {
  flex: 1;
  background: rgba(148, 163, 184, 0.15);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.danger {
  flex: 1;
  background: rgba(248, 113, 113, 0.16);
  color: #fca5a5;
  border: 1px solid rgba(248, 113, 113, 0.25);
}

.input-box {
  margin-top: 12rpx;
}

.input-label {
  color: #cbd5e1;
  font-size: 26rpx;
}

.textarea {
  margin: 12rpx 0;
  padding: 14rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 12rpx;
  color: #e2e8f0;
}

.form-row {
  margin-bottom: 18rpx;
}

.label {
  display: block;
  margin-bottom: 8rpx;
}

.input,
.picker {
  width: 100%;
  padding: 14rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #e2e8f0;
}

.history {
  max-height: 520rpx;
}

.history-row {
  padding: 16rpx;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(148, 163, 184, 0.18);
  margin-bottom: 12rpx;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;
}

.badge {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
  font-size: 22rpx;
}

.badge.ghost {
  background: rgba(99, 102, 241, 0.12);
  color: #cbd5ff;
}

.time {
  color: #94a3b8;
  font-size: 24rpx;
}

.origin {
  color: #e2e8f0;
  font-size: 30rpx;
  line-height: 1.5;
}

.translated {
  display: flex;
  gap: 10rpx;
  align-items: center;
  margin-top: 8rpx;
}

.translated .text {
  color: #cbd5ff;
  font-size: 28rpx;
}

.empty {
  color: #94a3b8;
  text-align: center;
  padding: 32rpx 0;
}

@media (max-width: 700px) {
  .grid {
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

  .primary,
  .ghost,
  .danger {
    flex: unset;
  }
}
</style>
