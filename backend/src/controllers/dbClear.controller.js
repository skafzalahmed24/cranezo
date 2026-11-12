const { dbClearService } = require('../services/dbClear.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// off unless ALLOW_DB_CLEAR=true is in the server's .env: the panel can never wipe data by accident
const gate = (res) => {
  if (dbClearService.apiAllowed()) return false;
  errorResponse(res, 'Clearing the database from the panel is switched off. Set ALLOW_DB_CLEAR=true in the server .env and restart, or use the command: npm run db:clear', null, 403);
  return true;
};

module.exports = {
  /** What would be cleared and kept; also says whether the page may clear */
  preview: async (req, res) => {
    try {
      const data = await dbClearService.preview();
      return successResponse(res, 'Database preview', { ...data, enabled: dbClearService.apiAllowed() });
    } catch (error) {
      return errorResponse(res, 'Could not read the database', null, 500);
    }
  },

  clear: async (req, res) => {
    if (gate(res)) return undefined;
    try {
      const body = req.body || {};
      const data = await dbClearService.clear({ confirm: body.confirm, deleteFiles: body.delete_files === true });
      console.warn(`[DB] Cleared by admin ${req.admin ? req.admin.id : '?'}: ${data.rows_deleted} rows, ${data.files_deleted} files`);
      return successResponse(res, 'Database cleared. Static data was kept.', data);
    } catch (error) {
      return errorResponse(res, error.statusCode ? error.message : 'Could not clear the database', null, error.statusCode || 500);
    }
  }
};
