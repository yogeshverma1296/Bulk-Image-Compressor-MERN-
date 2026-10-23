const router = require('express').Router();
const multer = require('multer');
const sharp = require('sharp');
const archiver = require('archiver');
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const Job = require('../models/Job');

const OUT = path.join(__dirname, '..', 'outputs');
const FORMATS = ['original', 'jpeg', 'png', 'webp', 'avif'];
const EXT = { jpeg: 'jpg', png: 'png', webp: 'webp', avif: 'avif' };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 50 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpeg|png|webp|avif|gif|tiff)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(Object.assign(new Error(`${file.originalname} is not a supported image type.`), { status: 400 })),
});

function parseSettings(body) {
  const quality = Math.min(100, Math.max(1, parseInt(body.quality, 10) || 75));
  const format = FORMATS.includes(body.format) ? body.format : 'original';
  let maxWidth = parseInt(body.maxWidth, 10) || 0;
  if (maxWidth && (maxWidth < 16 || maxWidth > 10000)) maxWidth = 0;
  return { quality, format, maxWidth };
}

async function compressOne(buffer, { quality, format, maxWidth }) {
  let target = format;
  if (format === 'original') {
    const meta = await sharp(buffer).metadata();
    target = EXT[meta.format] ? meta.format : 'webp'; // gif/tiff fall back to webp
  }
  let img = sharp(buffer).rotate(); // respect EXIF orientation, strips metadata
  if (maxWidth) img = img.resize({ width: maxWidth, withoutEnlargement: true });

  if (target === 'jpeg') img = img.jpeg({ quality, mozjpeg: true });
  else if (target === 'png') img = img.png({ quality, compressionLevel: 9, palette: true });
  else if (target === 'webp') img = img.webp({ quality });
  else img = img.avif({ quality });

  const { data, info } = await img.toBuffer({ resolveWithObject: true });
  return { data, info, target };
}

// POST /api/compress  (multipart: images[], quality, format, maxWidth)
router.post('/compress', upload.array('images', 50), async (req, res, next) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'Add at least one image.' });

    const settings = parseSettings(req.body);
    const job = new Job({ settings });
    const dir = path.join(OUT, job.id);
    await fs.mkdir(dir, { recursive: true });

    const used = new Set();
    for (const f of req.files) {
      const entry = { originalName: f.originalname, originalSize: f.size };
      try {
        let { data, info, target } = await compressOne(f.buffer, settings);
        let size = info.size;

        // Never return a bigger file when the format is unchanged
        if (settings.format === 'original' && size >= f.size) {
          data = f.buffer;
          size = f.size;
        }

        const base = path.parse(f.originalname).name.replace(/[^\w.-]+/g, '_') || 'image';
        let name = `${base}.${EXT[target]}`;
        for (let n = 1; used.has(name); n++) name = `${base}-${n}.${EXT[target]}`;
        used.add(name);

        await fs.writeFile(path.join(dir, name), data);
        Object.assign(entry, {
          outputName: name,
          compressedSize: size,
          width: info.width,
          height: info.height,
          format: target,
          status: 'done',
        });
        job.totalOriginal += f.size;
        job.totalCompressed += size;
      } catch (err) {
        Object.assign(entry, { status: 'failed', error: 'Could not read this image.' });
      }
      job.files.push(entry);
    }

    await job.save();
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs  (recent history)
router.get('/jobs', async (req, res, next) => {
  try {
    res.json(await Job.find().sort({ createdAt: -1 }).limit(20).lean());
  } catch (err) {
    next(err);
  }
});

async function findJob(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: 'Job not found.' });
    return null;
  }
  const job = await Job.findById(req.params.id);
  if (!job) res.status(404).json({ error: 'Job not found. It may have expired.' });
  return job;
}

router.get('/jobs/:id', async (req, res, next) => {
  try {
    const job = await findJob(req, res);
    if (job) res.json(job);
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/:id/download  -> ZIP of all compressed images
router.get('/jobs/:id/download', async (req, res, next) => {
  try {
    const job = await findJob(req, res);
    if (!job) return;
    res.attachment(`compressed-${job.id}.zip`);
    const zip = archiver('zip', { zlib: { level: 0 } }); // images are already compressed
    zip.on('error', next);
    zip.pipe(res);
    zip.directory(path.join(OUT, job.id), false);
    zip.finalize();
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/:id/files/:name  -> single compressed image
router.get('/jobs/:id/files/:name', async (req, res, next) => {
  try {
    const job = await findJob(req, res);
    if (!job) return;
    const file = job.files.find((f) => f.outputName === req.params.name);
    if (!file) return res.status(404).json({ error: 'File not found.' });
    res.download(path.join(OUT, job.id, path.basename(file.outputName)));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/jobs/:id
router.delete('/jobs/:id', async (req, res, next) => {
  try {
    const job = await findJob(req, res);
    if (!job) return;
    await fs.rm(path.join(OUT, job.id), { recursive: true, force: true });
    await job.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.OUT = OUT;
