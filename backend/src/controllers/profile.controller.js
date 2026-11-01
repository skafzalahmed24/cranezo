const { myProfileService, ProfileError } = require('../services/myProfile.service');
const { craneService, ServiceError } = require('../services/crane.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handle = (res, error) => {
  if (error instanceof ProfileError || error instanceof ServiceError) {
    return errorResponse(res, error.message, null, error.statusCode);
  }
  return errorResponse(res, error.message, null, 500);
};

/** My Profile APIs for the mobile apps (customer, operator, owner). The user always comes from the token. */
class ProfileController {
  async me(req, res) {
    try {
      return successResponse(res, 'Profile retrieved successfully.', await myProfileService.getMe(req.user.id));
    } catch (error) { return handle(res, error); }
  }

  async update(req, res) {
    try {
      return successResponse(res, 'Profile updated successfully.', await myProfileService.update(req.user.id, req.body || {}));
    } catch (error) { return handle(res, error); }
  }

  async languages(req, res) {
    try {
      return successResponse(res, 'Languages retrieved successfully.', await myProfileService.languages(req.user.id));
    } catch (error) { return handle(res, error); }
  }

  async saveLanguage(req, res) {
    try {
      const data = await myProfileService.saveLanguage(req.user.id, (req.body || {}).language_id);
      return successResponse(res, 'Language updated successfully.', data);
    } catch (error) { return handle(res, error); }
  }

  async appearance(req, res) {
    try {
      return successResponse(res, 'Appearance options retrieved successfully.', await myProfileService.appearance(req.user.id));
    } catch (error) { return handle(res, error); }
  }

  async saveAppearance(req, res) {
    try {
      const data = await myProfileService.saveAppearance(req.user.id, (req.body || {}).appearance);
      return successResponse(res, 'Appearance updated successfully.', data);
    } catch (error) { return handle(res, error); }
  }

  async notifications(req, res) {
    try {
      return successResponse(res, 'Notification settings retrieved successfully.', await myProfileService.notifications(req.user.id));
    } catch (error) { return handle(res, error); }
  }

  async saveNotifications(req, res) {
    try {
      const data = await myProfileService.saveNotifications(req.user.id, (req.body || {}).preferences);
      return successResponse(res, 'Notification preferences saved successfully.', data);
    } catch (error) { return handle(res, error); }
  }

  async logout(req, res) {
    try {
      await myProfileService.logout(req.user.id);
      return successResponse(res, 'Logged out successfully.', null);
    } catch (error) { return handle(res, error); }
  }

  // Terms & Conditions / Privacy Policy (public)
  async legal(req, res) {
    try {
      return successResponse(res, 'Content retrieved successfully.', await myProfileService.legal((req.body || {}).type));
    } catch (error) { return handle(res, error); }
  }

  // Operator: cranes assigned to me (details for the "View Details" link on My Profile)
  async assignedCranes(req, res) {
    try {
      const craneId = (req.body || {}).crane_id;
      if (craneId && !UUID_RE.test(craneId)) return errorResponse(res, 'Invalid crane_id.', null, 400);
      const cranes = await craneService.listOperatorCranes(req.user.id, craneId || null);
      return successResponse(
        res,
        craneId ? 'Crane details retrieved successfully.' : 'Assigned cranes retrieved successfully.',
        craneId ? cranes[0] : cranes
      );
    } catch (error) { return handle(res, error); }
  }
}

module.exports = new ProfileController();
