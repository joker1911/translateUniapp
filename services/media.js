const subtitleCache = new Map()
const translationCache = new Map()
const dictionaryCache = new Map()

function requestWrapper(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      success: (res) => resolve(res),
      fail: reject
    })
  })
}

function buildSubtitleCacheKey(videoId, lang, target) {
  return `${videoId || 'default'}:${lang || 'en'}:${target || ''}`
}

function normalizeCue(cue) {
  return {
    id: cue.id,
    startMs: cue.startMs,
    endMs: cue.endMs,
    text: cue.text || '',
    translation: cue.translation || '',
    tokens: cue.tokens || [],
    lang: cue.lang || 'en'
  }
}

function mockSubtitles() {
  return [
    {
      id: 1,
      startMs: 0,
      endMs: 3800,
      text: 'Welcome to Oslo, we just arrived and look at this gorgeous hotel room.',
      translation: '欢迎来到奥斯陆，我们刚到，就看看这间华美的酒店房间。',
      tokens: [
        { t: 'Welcome', norm: 'welcome' },
        { t: ' to ', norm: '' },
        { t: 'Oslo', norm: 'oslo' },
        { t: ', we just arrived and look at this gorgeous hotel room.', norm: '' }
      ],
      lang: 'en'
    },
    {
      id: 2,
      startMs: 3900,
      endMs: 7200,
      text: 'The view outside is amazing, and we cannot wait to explore the city.',
      translation: '窗外的景色令人惊叹，我们迫不及待地想去探索这座城市。',
      tokens: [
        { t: 'The', norm: 'the' },
        { t: ' view outside is amazing, ', norm: '' },
        { t: 'and', norm: 'and' },
        { t: ' we cannot wait to explore the city.', norm: '' }
      ],
      lang: 'en'
    },
    {
      id: 3,
      startMs: 7400,
      endMs: 10600,
      text: 'Stay tuned for more clips from our journey.',
      translation: '敬请期待我们旅途中的更多片段。',
      tokens: [
        { t: 'Stay', norm: 'stay' },
        { t: ' tuned for more clips from our journey.', norm: '' }
      ],
      lang: 'en'
    }
  ]
}

export async function fetchSubtitles(videoId, lang, target) {
  const cacheKey = buildSubtitleCacheKey(videoId, lang, target)
  if (subtitleCache.has(cacheKey)) {
    return subtitleCache.get(cacheKey)
  }

  try {
    const response = await requestWrapper({
      url: `/api/videos/${videoId}/subtitles`,
      method: 'GET',
      data: {
        lang,
        target,
        format: 'json'
      }
    })

    const cues = response?.data?.cues?.map(normalizeCue) || []
    const sorted = cues.sort((a, b) => a.startMs - b.startMs)
    subtitleCache.set(cacheKey, sorted)
    return sorted
  } catch (error) {
    const fallback = mockSubtitles()
    subtitleCache.set(cacheKey, fallback)
    return fallback
  }
}

export async function translateMissingCues(videoId, cues, sourceLang, targetLang) {
  const cacheKey = `${videoId}:${sourceLang}:${targetLang}`
  const cachedTranslation = translationCache.get(cacheKey)
  if (cachedTranslation) {
    return cues.map((cue) => ({ ...cue, translation: cachedTranslation[cue.id] || cue.translation }))
  }

  const missing = cues.filter((cue) => !cue.translation)
  if (!missing.length) return cues

  const requestBody = {
    sourceLang: sourceLang || 'en',
    targetLang: targetLang || 'zh',
    cues: missing.map((cue) => ({ id: cue.id, text: cue.text }))
  }

  try {
    const response = await requestWrapper({
      url: '/api/translate/cues',
      method: 'POST',
      data: requestBody
    })

    const items = response?.data?.items || []
    const translationMap = items.reduce((acc, item) => {
      acc[item.id] = item.translation
      return acc
    }, {})

    translationCache.set(cacheKey, translationMap)
    return cues.map((cue) => ({ ...cue, translation: translationMap[cue.id] || cue.translation }))
  } catch (error) {
    return cues
  }
}

export async function lookupDictionary(term, sourceLang, targetLang) {
  if (!term) return null
  const key = `${term.toLowerCase()}:${sourceLang || 'en'}:${targetLang || 'zh'}`
  if (dictionaryCache.has(key)) {
    return dictionaryCache.get(key)
  }

  try {
    const response = await requestWrapper({
      url: '/api/dict',
      method: 'GET',
      data: {
        term,
        sourceLang,
        targetLang
      }
    })

    const payload = response?.data
    dictionaryCache.set(key, payload)
    return payload
  } catch (error) {
    const fallback = {
      term,
      phonetic: '',
      pos: [],
      examples: [],
      message: '未能获取释义'
    }
    dictionaryCache.set(key, fallback)
    return fallback
  }
}
