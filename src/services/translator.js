/**
 * 调用可配置的翻译 API。
 * 支持：
 * - Google 翻译 API（REST）
 * - 自定义/大模型接口（通过通用 POST）
 * 如果请求失败，会回退返回原文，避免 UI 阻塞。
 */
export function translateText(config, text) {
  if (!text || !text.trim()) {
    return Promise.resolve('')
  }

  const { provider, apiKey, endpoint, sourceLanguage, targetLanguage, model } = config
  const payload = buildPayload(provider, text, sourceLanguage, targetLanguage, model)
  const headers = buildHeaders(provider, apiKey)

  return new Promise((resolve) => {
    uni.request({
      url: endpoint,
      method: 'POST',
      header: headers,
      data: payload,
      success: (res) => {
        const translated = parseResult(provider, res.data)
        resolve(translated || text)
      },
      fail: () => {
        resolve(`${text} (未能调用接口，已回退原文)`)
      }
    })
  })
}

function buildPayload(provider, text, sourceLanguage, targetLanguage, model) {
  if (provider === 'google') {
    const payload = {
      q: text,
      target: targetLanguage || 'en',
      format: 'text'
    }
    if (sourceLanguage && sourceLanguage !== 'auto') {
      payload.source = sourceLanguage
    }
    return payload
  }

  // 通用/大模型接口示例
  return {
    prompt: `Translate to ${targetLanguage || 'en'}: ${text}`,
    model,
    stream: false
  }
}

function buildHeaders(provider, apiKey) {
  if (provider === 'google') {
    return {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    }
  }

  return {
    'Content-Type': 'application/json',
    Authorization: apiKey ? `Bearer ${apiKey}` : undefined
  }
}

function parseResult(provider, data) {
  if (!data) return ''

  if (provider === 'google') {
    return data?.data?.translations?.[0]?.translatedText || ''
  }

  // 兼容通用/大模型接口
  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content
  }
  if (data?.translation || data?.translated_text) {
    return data.translation || data.translated_text
  }
  return ''
}
