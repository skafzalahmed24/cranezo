const { successResponse, errorResponse } = require('../utils/apiResponse');

class UploadController {
  /**
   * Upload single or multiple files
   * type = 1 : Single upload
   * type = 2 : Multiple upload
   * POST /api/upload
   */
  async uploadFile(req, res) {
    try {
      const files = req.files || [];
      if (req.file) {
        files.push(req.file);
      }

      if (!files || files.length === 0) {
        return errorResponse(res, 'No file(s) uploaded. Please provide at least one file.', null, 400);
      }

      // Determine upload type (1: single, 2: multiple)
      const rawType = req.body?.type ?? req.query?.type;
      const uploadType = rawType !== undefined && rawType !== null && rawType !== ''
        ? parseInt(rawType, 10)
        : (files.length > 1 ? 2 : 1);

      const currentTimestamp = new Date().toISOString();

      if (uploadType === 1) {
        // Type 1: Single file upload
        const file = files[0];
        const relativeUrl = `/public/uploads/${file.filename}`;

        const fileData = {
          file_url: relativeUrl,
          file_name: file.originalname,
          stored_name: file.filename,
          file_path: relativeUrl,
          file_size: file.size,
          mime_type: file.mimetype,
          upload_type: 1,
          timestamp: currentTimestamp
        };

        return successResponse(res, 'File uploaded successfully.', fileData, 200);
      } else {
        // Type 2: Multiple files upload
        const fileList = files.map((file) => {
          const relativeUrl = `/public/uploads/${file.filename}`;
          return {
            file_url: relativeUrl,
            file_name: file.originalname,
            stored_name: file.filename,
            file_path: relativeUrl,
            file_size: file.size,
            mime_type: file.mimetype,
            timestamp: currentTimestamp
          };
        });

        const responseData = {
          total_files: fileList.length,
          upload_type: 2,
          files: fileList,
          timestamp: currentTimestamp
        };

        return successResponse(res, 'Files uploaded successfully.', responseData, 200);
      }
    } catch (error) {
      return errorResponse(res, error.message || 'File upload failed.', null, 500);
    }
  }
}

module.exports = new UploadController();
