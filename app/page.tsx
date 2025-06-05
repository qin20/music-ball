"use client"

import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [timestamps, setTimestamps] = useState<number[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log(e.code);
      if (e.code === 'KeyS' && audioRef.current) {
        e.preventDefault(); // 防止页面滚动
        const currentTime = audioRef.current.currentTime;
        setTimestamps((prev) => [...prev, parseFloat(currentTime.toFixed(3))]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    setTimestamps([]);
  };

  const handleExtract = async () => {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamps }),
    });

    const data = await res.json();
    console.log('提取结果:', data);
    alert(JSON.stringify(data, null, 2)); // 简单显示，后续可替换为更好的UI
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>🎵 音频节拍标记 Demo</h1>
      <audio controls ref={audioRef} src="/audio.mp3" style={{ width: '100%' }} />

      <div style={{ marginTop: 20 }}>
        <h2>已记录时间点：</h2>
        <ul>
          {timestamps.map((time, index) => (
            <li key={index}>{time}s</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={handleExtract} style={{ marginRight: 10 }}>提取音调</button>
        <button onClick={handleClear}>清空时间点</button>
      </div>
    </main>
  );
}
