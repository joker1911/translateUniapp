import React from 'react';
import type { Cue } from '../api';

interface Props {
  cue: Cue;
  active: boolean;
  onClick: (time: number) => void;
  onWordClick: (term: string, target: HTMLElement) => void;
}

export function SubtitleItem({ cue, active, onClick, onWordClick }: Props) {
  return (
    <li
      className={`subtitle-item ${active ? 'active' : ''}`}
      onClick={() => onClick(cue.startMs / 1000)}
    >
      <p className="subtitle-en">
        {cue.tokens.map((token, idx) => {
          const isWord = Boolean(token.norm);
          return (
            <span
              key={`${cue.id}-${idx}`}
              className={`token ${isWord ? 'word' : ''}`}
              onClick={(e) => {
                if (!isWord) return;
                e.stopPropagation();
                onWordClick(token.norm, e.currentTarget);
              }}
            >
              {token.t}
            </span>
          );
        })}
      </p>
      <p className="subtitle-zh">{cue.translation ?? '(无翻译)'}</p>
    </li>
  );
}
