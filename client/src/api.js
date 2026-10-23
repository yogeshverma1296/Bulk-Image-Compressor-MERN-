import axios from 'axios';

export const BASE = import.meta.env.VITE_API_URL || '/api';
const http = axios.create({ baseURL: BASE });

export const compressImages = (formData, onProgress) =>
  http
    .post('/compress', formData, {
      onUploadProgress: (e) => e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
    })
    .then((r) => r.data);

export const getJobs = () => http.get('/jobs').then((r) => r.data);
export const deleteJob = (id) => http.delete(`/jobs/${id}`);
export const zipUrl = (id) => `${BASE}/jobs/${id}/download`;
export const fileUrl = (id, name) => `${BASE}/jobs/${id}/files/${encodeURIComponent(name)}`;
