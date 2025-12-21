export interface SubtitleToken {
  t: string;
  norm: string;
}

export interface Cue {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
  translation?: string;
  tokens: SubtitleToken[];
}

export interface SubtitlesResponse {
  videoId: string;
  lang: string;
  target?: string;
  cues: Cue[];
}

export interface DictResult {
  term: string;
  phonetic?: string;
  pos?: Array<{ type: string; meaning: string }>;
  examples?: Array<{ en: string; zh: string }>;
}

const baseUrl = '/api';

export async function fetchSubtitles(videoId: string, lang = 'en', target = 'zh'): Promise<SubtitlesResponse> {
  const res = await fetch(`${baseUrl}/videos/${videoId}/subtitles?lang=${lang}&target=${target}&format=json`);
  if (!res.ok) throw new Error('加载字幕失败');
  return res.json();
}

export async function fetchDict(term: string, sourceLang = 'en', targetLang = 'zh'): Promise<DictResult> {
  const res = await fetch(`${baseUrl}/dict?term=${encodeURIComponent(term)}&sourceLang=${sourceLang}&targetLang=${targetLang}`);
  if (!res.ok) throw new Error('查词失败');
  return res.json();
}
