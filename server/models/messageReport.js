const mongoose = require("mongoose");

const messageReportSchema = new mongoose.Schema({
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", required: true },
    reason: { type: String, enum: ["suspected_scam", "credential_request", "suspicious_link", "spam", "other"], required: true },
    details: { type: String, default: "", maxlength: 500 }
}, { timestamps: true });

messageReportSchema.index({ reporterId: 1, messageId: 1 }, { unique: true });
messageReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model("MessageReport", messageReportSchema);
