import { formatBytes, savedPercent } from '../utils.js';

export default function History({ jobs, activeId, onOpen, onDelete }) {
  if (!jobs.length) return <p className="muted">Your finished jobs will appear here.</p>;
  return (
    <ul className="history">
      {jobs.map((j) => (
        <li key={j._id} className={j._id === activeId ? 'active' : ''}>
          <button className="link" onClick={() => onOpen(j)}>
            <strong>{j.files.length} image{j.files.length === 1 ? '' : 's'}</strong>
            <span className="muted">
              {savedPercent(j.totalOriginal, j.totalCompressed)}% saved, {formatBytes(j.totalOriginal)} to{' '}
              {formatBytes(j.totalCompressed)}
            </span>
            <span className="muted">{new Date(j.createdAt).toLocaleString()}</span>
          </button>
          <button className="icon" aria-label="Delete job" onClick={() => onDelete(j._id)}>x</button>
        </li>
      ))}
    </ul>
  );
}
