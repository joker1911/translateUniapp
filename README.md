# 项目说明文档（AI 使用版）

## 1. 项目目标（Objective）

开发一款 **视频 + 可交互字幕 + 即时翻译 + 单词查词** 的学习型播放器页面，用于语言学习场景。

核心体验目标：
- 视频播放与字幕严格时间同步
- 点击字幕行 → 视频跳转到对应时间
- 播放过程中 → 当前字幕高亮并自动滚动
- 字幕中的英文单词可点击 → 调用字典接口显示释义
- 支持英文 + 中文双语字幕显示

---

## 2. 系统架构概览

```text
Frontend (Web SPA)
 ├─ Video Player
 ├─ Subtitle Panel (Interactive)
 ├─ Dictionary Popup
 └─ Playback Controls

Backend (API)
 ├─ Video Streaming API
 ├─ Subtitle API (SRT / JSON)
 ├─ Translation API
 └─ Dictionary API
前端与后端通过 HTTP JSON API 通信，不涉及 WebSocket。

3. 前端功能需求（Functional Requirements）
3.1 视频播放
支持 MP4（需支持 HTTP Range）或 HLS

可获取当前播放时间 currentTime

可设置播放时间 video.currentTime = x

3.2 字幕展示
右侧显示字幕列表（按时间顺序）

每条字幕包含：

英文原文

中文翻译（可选）

当前播放时间对应的字幕行高亮显示

高亮字幕始终保持在可视区域中间

3.3 字幕交互
点击任意字幕行：

视频跳转到该字幕的起始时间

播放时：

自动切换高亮字幕

不允许多行同时高亮

3.4 单词查词
字幕中的 英文单词可点击

点击单词后：

调用字典接口

在单词附近显示浮层（tooltip / popover）

查词浮层内容包括：

单词

音标（如有）

中文释义

示例（可选）

4. 后端接口规范（API Contract）
4.1 视频接口
GET /api/videos/{videoId}/stream
返回视频流

必须支持 HTTP Range

Content-Type: video/mp4 或 application/vnd.apple.mpegurl

4.2 字幕接口（核心）
GET /api/videos/{videoId}/subtitles
Query 参数

参数	类型	说明
lang	string	原语言，如 en
target	string	目标语言，如 zh（可选）
format	string	json 或 srt

返回（JSON 格式）
json
复制代码
{
  "videoId": "string",
  "lang": "en",
  "target": "zh",
  "cues": [
    {
      "id": 12,
      "startMs": 18480,
      "endMs": 19200,
      "text": "and look at this gorgeous hotel room.",
      "translation": "看看这间绝美的酒店客房。",
      "tokens": [
        { "t": "and", "norm": "and" },
        { "t": " ", "norm": "" },
        { "t": "look", "norm": "look" },
        { "t": " ", "norm": "" },
        { "t": "gorgeous", "norm": "gorgeous" },
        { "t": " ", "norm": "" },
        { "t": "hotel", "norm": "hotel" },
        { "t": " ", "norm": "" },
        { "t": "room", "norm": "room" },
        { "t": ".", "norm": "" }
      ]
    }
  ]
}
字段说明

startMs / endMs：毫秒单位，字幕时间轴

tokens：

t：原始显示文本

norm：用于查词的标准化单词（非单词则为空）

4.3 翻译接口（可选独立）
POST /api/translate/cues
json
复制代码
{
  "sourceLang": "en",
  "targetLang": "zh",
  "cues": [
    { "id": 1, "text": "We just arrived in Oslo" }
  ]
}
返回：

json
复制代码
{
  "items": [
    { "id": 1, "translation": "我们刚到奥斯陆" }
  ]
}
4.4 字典接口
GET /api/dict
Query 参数

参数	示例
term	gorgeous
sourceLang	en
targetLang	zh

返回：

json
复制代码
{
  "term": "gorgeous",
  "phonetic": "ˈɡɔːrdʒəs",
  "pos": [
    { "type": "adj", "meaning": "极好的；非常漂亮的" }
  ],
  "examples": [
    { "en": "a gorgeous view", "zh": "极美的景色" }
  ]
}
5. 关键前端逻辑约束（Important Constraints）
5.1 字幕同步算法
必须使用 二分查找 根据 currentTime 定位当前字幕

不允许每次播放时间更新时线性扫描字幕数组

5.2 点击冲突处理
点击单词查词时：

必须阻止触发字幕行的跳转行为

使用 event.stopPropagation()

5.3 自动滚动规则
仅当当前字幕变化时触发滚动

使用 scrollIntoView({ block: "center" })

6. 非功能性要求（Non-Functional）
字幕数量 ≥ 1000 条时仍需流畅

查词、翻译接口需缓存

前端渲染需避免频繁 reflow

移动端可用（不要求完美适配）

7. 明确不做的事情（Out of Scope）
用户系统 / 登录

生词本持久化

弹幕

AI 自动生成视频内容

8. 可扩展方向（Future）
单句循环播放

精听模式（自动暂停）

生词高亮

多语言字幕切换

AI 语音跟读评分

9. 输出预期（For AI）
AI 在理解本项目后，应能：

生成前端页面结构与核心组件

实现字幕与视频时间同步

实现字幕点击跳转

实现单词点击查词弹窗

正确对接上述 API 契约
