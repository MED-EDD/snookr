import React, { useEffect, useRef } from 'react';
import { startAnimation } from '../animation/animation';

const DemoCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    const stop = startAnimation(canvas);

    const observer = new ResizeObserver(() => {
      resize();
      stop();
      startAnimation(canvas);
    });
    observer.observe(container);

    return () => {
      stop();
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="demo-canvas-container">
      <canvas ref={canvasRef} className="demo-canvas" />
    </div>
  );
};

export default DemoCanvas;
