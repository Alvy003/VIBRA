// backend/models/AIPlaylist.model.js

import mongoose from 'mongoose';

const aiPlaylistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  userId: {
    type: String,
    default: null,
    index: true,
  },
  vibe: {
    type: String,
    enum: ['chill', 'party', 'focus', 'workout', 'romantic', 'sad', 'any', 'imported'],
    required: true,
  },
  language: {
    type: String,
    enum: ['hindi', 'english', 'punjabi', 'tamil', 'telugu', 'malayalam', 'multi', 'any'],
    required: true,
  },
  era: {
    type: String,
    enum: ['latest', 'classic', 'mix', 'mixed'],
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  tracks: [{
    externalId: String,
    title: { type: String, required: true },
    artist: { type: String, required: true },
    imageUrl: String,
    streamUrl: String,
    audioUrl: String,
    duration: Number,
    source: {
      type: String,
      default: 'jiosaavn',
    },
    score: Number,
  }],
  coverArt: {
    type: String,
    default: null,
  },
  metadata: {
    discoveryType: String, // 'daily', 'weekly'
    weekSeed: String,      // e.g. 'userId_2024_W13'
    searchQuery: String,
    searchQueries: [String],
    moodKeywords: [String],
    aiGenerated: {
      type: Boolean,
      default: false,
    },
    aiModel: {
      type: String,
      default: 'llama-3.1-70b',
    },
    generatedAt: Date,
    matchRate: Number,
  },
  stats: {
    plays: {
      type: Number,
      default: 0,
    },
    saves: {
      type: Number,
      default: 0,
    },
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
}, {
  timestamps: true,
});

// Indexes
aiPlaylistSchema.index({ vibe: 1, language: 1, era: 1, size: 1 });
aiPlaylistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
aiPlaylistSchema.index({ userId: 1, createdAt: -1 });
aiPlaylistSchema.index({ 'metadata.aiGenerated': 1 });

export default mongoose.model('AIPlaylist', aiPlaylistSchema);