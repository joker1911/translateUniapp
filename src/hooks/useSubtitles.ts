import { useEffect, useMemo, useState } from 'react';
import type { Cue, SubtitlesResponse } from '../api';
import { fetchSubtitles } from '../api';

interface UseSubtitlesOptions {
  videoId: string;
  lang?: string;
  target?: string;
}

export function useSubtitles({ videoId, lang = 'en', target = 'zh' }: UseSubtitlesOptions) {
  const [data, setData] = useState<SubtitlesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    fetchSubtitles(videoId, lang, target)
      .then((res) => {
        if (!canceled) setData(res);
      })
      .catch((err) => !canceled && setError(err.message))
      .finally(() => !canceled && setLoading(false));
    return () => {
      canceled = true;
    };
  }, [videoId, lang, target]);

  const cues = data?.cues ?? [];

  const findActiveIndex = useMemo(() => {
    return (currentTime: number) => binarySearchCueIndex(cues, currentTime);
  }, [cues]);

  return { data, cues, loading, error, findActiveIndex };
}

export function binarySearchCueIndex(cues: Cue[], currentTime: number) {
  let left = 0;
  let right = cues.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const cue = cues[mid];
    const start = cue.startMs / 1000;
    const end = cue.endMs / 1000;
    if (currentTime >= start && currentTime <= end) return mid;
    if (currentTime < start) right = mid - 1;
    else left = mid + 1;
  }
  return -1;
}
