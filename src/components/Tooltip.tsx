import React from 'react';
import type { DictResult } from '../api';

interface Props {
  data: DictResult | null;
  position: { x: number; y: number } | null;
}

export function Tooltip({ data, position }: Props) {
  if (!data || !position) return null;
  return (
    <div
      className="tooltip"
      style={{ left: position.x, top: position.y, position: 'absolute' }}
    >
      <h4>{data.term}</h4>
      {data.phonetic && <div className="phonetic">{data.phonetic}</div>}
      {data.pos?.map((item, idx) => (
        <p className="meaning" key={`${item.type}-${idx}`}>
          {item.type ? `${item.type}. ` : ''}
          {item.meaning}
        </p>
      ))}
      {!data.pos?.length && <p className="meaning">暂无释义</p>}
      {data.examples?.length ? (
        <ul>
          {data.examples.map((ex, idx) => (
            <li key={`ex-${idx}`}>
              <span>{ex.en}</span>
              <br />
              <span className="subtitle-zh">{ex.zh}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
