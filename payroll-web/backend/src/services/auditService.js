const AuditLog = require("../models/AuditLog");

async function log({ action, entity, entityId, performedBy = "system", details = {}, ip = "" }) {
  try {
    await AuditLog.create({ action, entity, entityId, performedBy, details, ip });
  } catch (err) {
    console.error("AuditLog write failed:", err.message);
  }
}

module.exports = { log };
