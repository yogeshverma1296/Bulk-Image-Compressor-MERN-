const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    originalName: String,
    outputName: String,
    originalSize: Number,
    compressedSize: Number,
    width: Number,
    height: Number,
    format: String,
    status: { type: String, enum: ['done', 'failed'], default: 'done' },
    error: String,
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    settings: {
      quality: Number,
      format: String,
      maxWidth: Number,
    },
    files: [fileSchema],
    totalOriginal: { type: Number, default: 0 },
    totalCompressed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);
