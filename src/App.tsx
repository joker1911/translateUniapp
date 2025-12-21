import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchDict, type Cue, type DictResult } from './api';
import { SubtitleItem } from './components/SubtitleItem';
import { Tooltip } from './components/Tooltip';
import { binarySearchCueIndex, useSubtitles } from './hooks/useSubtitles';

function useVideoSync(cues: Cue[], findActiveIndex: (time: number) => number) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => {
      const index = findActiveIndex(video.currentTime);
      setActiveIndex((prev) => {
        if (prev === index) return prev;
        return index;
      });
    };
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [findActiveIndex]);

  const jumpTo = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    void video.play();
  };

  return { videoRef, activeIndex, jumpTo };
}

function useDictPopover() {
  const [dict, setDict] = useState<DictResult | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<number | undefined>();

  const hide = () => setPos(null);

  const show = (term: string, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const padding = 8;
    setPos({ x: rect.left + window.scrollX, y: rect.bottom + window.scrollY + padding });
    fetchDict(term)
      .then(setDict)
      .catch(() => setDict({ term, pos: [{ type: '', meaning: '暂无释义' }] }));
  };

  useEffect(() => {
    const handleScroll = () => hide();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { dict, pos, show, hide };
}

export default function App() {
  const { cues, loading, error, findActiveIndex } = useSubtitles({ videoId: 'demo', lang: 'en', target: 'zh' });
  const { videoRef, activeIndex, jumpTo } = useVideoSync(cues, findActiveIndex);
  const { dict, pos, show, hide } = useDictPopover();

  const handleWordClick = (term: string, target: HTMLElement) => {
    hide();
    show(term, target);
  };

  const activeCueId = activeIndex >= 0 ? cues[activeIndex]?.id : null;

  return (
    <div>
      <header className="app-header">
        <div>
          <h1>学习型播放器（React版）</h1>
          <p className="subtitle">视频 + 交互字幕 + 查词 + 翻译</p>
        </div>
        <div className="meta">根据 README 要求实现</div>
      </header>

      <main className="layout">
        <section className="player-panel">
          <video
            ref={videoRef}
            controls
            preload="metadata"
            src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
          />
          <div className="controls">
            <button onClick={() => videoRef.current?.play()}>播放</button>
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  void videoRef.current.play();
                }
              }}
            >
              回到开头
            </button>
          </div>
        </section>

        <section className="subtitle-panel">
          <div className="panel-header">
            <h2>字幕</h2>
            <div className="pill">后端接口驱动</div>
          </div>

          {loading && <p className="subtitle-zh">加载字幕中...</p>}
          {error && <p className="subtitle-zh">{error}</p>}

          <ul className="subtitle-list">
            {cues.map((cue, index) => (
              <SubtitleItem
                key={cue.id}
                cue={cue}
                active={activeIndex === index}
                onClick={jumpTo}
                onWordClick={handleWordClick}
              />
            ))}
          </ul>
        </section>
      </main>

      <Tooltip data={dict} position={pos} />
    </div>
  );
}
