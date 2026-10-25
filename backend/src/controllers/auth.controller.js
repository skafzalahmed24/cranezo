const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

class AuthController {
  /**
   * Mobile user onboarding Step 1: Register or Login with OTP
   * POST /api/auth/registerOrLogin
   */
  async registerOrLogin(req, res) {
    try {
      const result = await authService.registerOrLogin(req.body);
      return successResponse(res, 'OTP generated and sent successfully.', result, 200);
    } catch (error) {
      return errorResponse(res, error.message, null, 400);
    }
  }

  /**
   * Mobile user onboarding Step 2: Verify OTP
   * POST /api/auth/verifyOtp
   */
  async verifyOtp(req, res) {
    try {
      const result = await authService.verifyOtp(req.body);
      return successResponse(res, 'OTP verified successfully.', result, 200);
    } catch (error) {
      return errorResponse(res, error.message, null, 400);
    }
  }

  /**
   * Mobile user onboarding Step 3: Complete / Update Profile with role_id, full_name, company_name
   * POST /api/auth/updateProfile (or /api/auth/setupProfile)
   */
  async updateProfile(req, res) {
    try {
      // Allow user_id from req.body or authenticated req.user.id
      const payload = {
        ...req.body,
        user_id: req.body.user_id || req.user?.id
      };
      const result = await authService.updateProfile(payload);
      return successResponse(res, 'User profile and role updated successfully.', result, 200);
    } catch (error) {
      return errorResponse(res, error.message, null, 400);
    }
  }

  /**
   * Admin login
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return errorResponse(res, 'Email and password are required.', null, 400);
      }

      const result = await authService.login(email, password);
      return successResponse(res, 'Login successful.', result);
    } catch (error) {
      return errorResponse(res, error.message, null, 401);
    }
  }

  /**
   * Admin / general register
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const { name, email, phone, password, role, companyName, licenseNumber, city } = req.body;
      if (!name || !email || !password) {
        return errorResponse(res, 'Name, email, and password are required.', null, 400);
      }

      const result = await authService.register({
        name,
        email,
        phone,
        password,
        role,
        companyName,
        licenseNumber,
        city
      });

      return successResponse(res, 'Registration successful.', result, 201);
    } catch (error) {
      return errorResponse(res, error.message, null, 400);
    }
  }

  /**
   * Get current profile
   * GET /api/auth/me
   */
  async getMe(req, res) {
    try {
      const profile = await authService.getProfile(req.user.id);
      return successResponse(res, 'User profile fetched successfully.', profile);
    } catch (error) {
      return errorResponse(res, error.message, null, 500);
    }
  }
}

module.exports = new AuthController();
