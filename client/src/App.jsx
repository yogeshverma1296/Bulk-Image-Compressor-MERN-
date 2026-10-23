import { useEffect, useMemo, useState } from 'react';
import Dropzone from './components/Dropzone.jsx';
import Results from './components/Results.jsx';
import History from './components/History.jsx';
import { compressImages, deleteJob, getJobs } from './api.js';
import { formatBytes } from './utils.js';

const MAX_FILES = 50;

export default function App() {
  const [files, setFiles] = useState([]);
  const [settings, setSettings] = useState({ quality: 75, format: 'original', maxWidth: '' });
  const [progress, setProgress] = useState(null);
  const [job, setJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  const loadHistory = () => getJobs().then(setHistory).catch(() => {});
  useEffect(() => { loadHistory(); }, []);

  const totalSize = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);
  const busy = progress !== null;

  function addFiles(list) {
    setError('');
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name + f.size));
      const next = [...prev];
      for (const f of list) {
        if (!f.type.startsWith('image/') || seen.has(f.name + f.size)) continue;
        if (next.length >= MAX_FILES) { setError(`Only ${MAX_FILES} images can be compressed at a time.`); break; }
        next.push(f);
      }
      return next;
    });
  }

  async function submit() {
    setError('');
    setProgress(0);
    const body = new FormData();
    files.forEach((f) => body.append('images', f));
    body.append('quality', settings.quality);
    body.append('format', settings.format);
    body.append('maxWidth', settings.maxWidth || 0);
    try {
      const result = await compressImages(body, setProgress);
      setJob(result);
      setFiles([]);
      loadHistory();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not compress the images. Check that the server is running.');
    } finally {
      setProgress(null);
    }
  }

  async function removeJob(id) {
    await deleteJob(id).catch(() => {});
    if (job?._id === id) setJob(null);
    loadHistory();
  }

  const set = (k) => (e) => setSettings((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="app">
      <header>
        <h1>Bulk Image Compressor</h1>
        <p className="muted">Shrink a whole folder of photos at once. Files are deleted from the server after 24 hours.</p>
      </header>

      <main>
        <div className="col">
          <section className="panel">
            <Dropzone onFiles={addFiles} disabled={busy} />

            {files.length > 0 && (
              <>
                <div className="queue-head">
                  <strong>{files.length} selected, {formatBytes(totalSize)}</strong>
                  <button className="link" disabled={busy} onClick={() => setFiles([])}>Clear all</button>
                </div>
                <ul className="queue">
                  {files.map((f) => (
                    <li key={f.name + f.size}>
                      <span className="file-name">{f.name}</span>
                      <span className="muted">{formatBytes(f.size)}</span>
                      <button className="icon" disabled={busy} aria-label={`Remove ${f.name}`}
                        onClick={() => setFiles((p) => p.filter((x) => x !== f))}>x</button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="settings">
              <label>
                Quality: <strong>{settings.quality}</strong>
                <input type="range" min="1" max="100" value={settings.quality} onChange={set('quality')} disabled={busy} />
              </label>
              <label>
                Output format
                <select value={settings.format} onChange={set('format')} disabled={busy}>
                  <option value="original">Keep original</option>
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                  <option value="avif">AVIF</option>
                </select>
              </label>
              <label>
                Max width (px)
                <input type="number" min="16" max="10000" placeholder="No resize" value={settings.maxWidth}
                  onChange={set('maxWidth')} disabled={busy} />
              </label>
            </div>

            {error && <p className="err" role="alert">{error}</p>}

            <button className="btn primary wide" disabled={!files.length || busy} onClick={submit}>
              {busy ? (progress < 100 ? `Uploading ${progress}%` : 'Compressing...') : `Compress ${files.length || ''} image${files.length === 1 ? '' : 's'}`}
            </button>
            {busy && <div className="progress"><div style={{ width: `${progress}%` }} /></div>}
          </section>

          <section className="panel">
            <h3>Recent jobs</h3>
            <History jobs={history} activeId={job?._id} onOpen={setJob} onDelete={removeJob} />
          </section>
        </div>

        <div className="col">
          {job ? (
            <Results job={job} onDelete={removeJob} />
          ) : (
            <section className="panel empty">
              <h2>Nothing compressed yet</h2>
              <p className="muted">Add images, pick a quality, and press Compress. Results and downloads show up here.</p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
