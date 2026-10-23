import { useRef, useState } from 'react';

export default function Dropzone({ onFiles, disabled }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) onFiles([...e.dataTransfer.files]);
  };

  return (
    <div
      className={`dropzone${over ? ' over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <p className="dz-title">Drop images here</p>
      <p className="muted">JPEG, PNG, WebP, AVIF, GIF or TIFF. Up to 50 images, 25 MB each.</p>
      <button type="button" className="btn ghost" disabled={disabled} onClick={() => input.current.click()}>
        Choose images
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/tiff"
        onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }}
      />
    </div>
  );
}
