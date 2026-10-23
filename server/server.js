require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const routes = require('./routes/jobs');
const Job = require('./models/Job');

const app = express();
const PORT = process.env.PORT || 5000;
const RETENTION_HOURS = Number(process.env.RETENTION_HOURS) || 24;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api', routes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 25 MB or smaller.'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'You can compress up to 50 images at a time.'
        : err.message;
    return res.status(400).json({ error: msg });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});

async function cleanup() {
  try {
    const cutoff = new Date(Date.now() - RETENTION_HOURS * 3600 * 1000);
    const old = await Job.find({ createdAt: { $lt: cutoff } }).select('_id');
    for (const job of old) {
      await fs.rm(path.join(routes.OUT, String(job._id)), { recursive: true, force: true });
      await job.deleteOne();
    }
  } catch (err) {
    console.error('Cleanup failed:', err.message);
  }
}

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bulk_image_compressor')
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
    cleanup();
    setInterval(cleanup, 3600 * 1000);
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
