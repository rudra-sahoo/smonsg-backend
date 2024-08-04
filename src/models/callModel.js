const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  callId: { type: String, required: true, unique: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['initiated', 'answered', 'ended'], default: 'initiated' }
}, { timestamps: true });

const Call = mongoose.model('Call', callSchema);
module.exports = Call;
