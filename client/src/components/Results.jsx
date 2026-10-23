import { fileUrl, zipUrl } from '../api.js';
import { formatBytes, savedPercent } from '../utils.js';

export default function Results({ job, onDelete }) {
  const done = job.files.filter((f) => f.status === 'done');
  const saved = savedPercent(job.totalOriginal, job.totalCompressed);

  return (
    <section className="panel">
      <div className="results-head">
        <div>
          <h2>{saved}% smaller</h2>
          <p className="muted">
            {formatBytes(job.totalOriginal)} to {formatBytes(job.totalCompressed)} across {done.length} image
            {done.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="row">
          <a className="btn primary" href={zipUrl(job._id)}>Download ZIP</a>
          <button className="btn ghost" onClick={() => onDelete(job._id)}>Delete</button>
        </div>
      </div>

      <ul className="files">
        {job.files.map((f, i) => {
          const pct = f.status === 'done' ? savedPercent(f.originalSize, f.compressedSize) : 0;
          return (
            <li key={i} className="file">
              <div className="file-top">
                <span className="file-name" title={f.originalName}>{f.originalName}</span>
                {f.status === 'done' ? (
                  <a href={fileUrl(job._id, f.outputName)}>Download</a>
                ) : (
                  <span className="err">{f.error}</span>
                )}
              </div>
              {f.status === 'done' && (
                <>
                  <div className="bar" aria-label={`${pct}% saved`}>
                    <div className="bar-left" style={{ width: `${100 - pct}%` }} />
                  </div>
                  <div className="file-meta muted">
                    {formatBytes(f.originalSize)} to {formatBytes(f.compressedSize)} ({pct}% saved), {f.width}x{f.height}, {f.format}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
