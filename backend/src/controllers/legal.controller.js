const { LegalPage } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const PAGE_TYPES = ['terms', 'privacy'];
const MAX_SECTIONS = 50;

const format = (page) => ({
  type: page.pageType,
  title: page.title,
  intro: page.intro,
  last_updated: page.lastUpdated,
  sections: page.sections.map((s, i) => ({
    number: i + 1,
    title: s.title,
    subtitle: s.subtitle || null,
    body: s.body
  })),
  sections_count: page.sections.length,
  updated_at: page.updatedAt
});

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Admin: edit the Terms & Conditions and Privacy Policy shown in the apps */
class LegalController {
  async list(req, res) {
    try {
      const pages = await LegalPage.findAll({ order: [['pageType', 'DESC']] });
      return successResponse(res, 'Legal pages retrieved successfully.', pages.map(format));
    } catch (error) {
      return errorResponse(res, error.message, null, 500);
    }
  }

  async get(req, res) {
    try {
      const type = String((req.body || {}).type || '').toLowerCase();
      if (!PAGE_TYPES.includes(type)) return errorResponse(res, 'type must be "terms" or "privacy".', null, 400);
      const page = await LegalPage.findOne({ where: { pageType: type } });
      if (!page) return errorResponse(res, 'Legal page not found.', null, 404);
      return successResponse(res, 'Legal page retrieved successfully.', format(page));
    } catch (error) {
      return errorResponse(res, error.message, null, 500);
    }
  }

  /** Replaces title, intro, date and the full list of sections (send every section you want to keep, in order) */
  async update(req, res) {
    try {
      const type = String(req.params.type || '').toLowerCase();
      if (!PAGE_TYPES.includes(type)) return errorResponse(res, 'type must be "terms" or "privacy".', null, 400);
      const page = await LegalPage.findOne({ where: { pageType: type } });
      if (!page) return errorResponse(res, 'Legal page not found.', null, 404);

      const { title, intro, last_updated: lastUpdated, sections } = req.body || {};
      const updates = {};

      if (title !== undefined) {
        if (!String(title).trim()) return errorResponse(res, 'title cannot be empty.', null, 400);
        updates.title = String(title).trim();
      }
      if (intro !== undefined) updates.intro = intro ? String(intro).trim() : null;

      if (sections !== undefined) {
        if (!Array.isArray(sections) || sections.length === 0) {
          return errorResponse(res, 'sections must be a list with at least one section.', null, 400);
        }
        if (sections.length > MAX_SECTIONS) {
          return errorResponse(res, `A page can have at most ${MAX_SECTIONS} sections.`, null, 400);
        }
        const clean = [];
        for (let i = 0; i < sections.length; i += 1) {
          const s = sections[i] || {};
          if (!String(s.title || '').trim()) return errorResponse(res, `Section ${i + 1}: title is required.`, null, 400);
          if (!String(s.body || '').trim()) return errorResponse(res, `Section ${i + 1}: body is required.`, null, 400);
          clean.push({
            title: String(s.title).trim(),
            subtitle: s.subtitle && String(s.subtitle).trim() ? String(s.subtitle).trim() : null,
            body: String(s.body).trim()
          });
        }
        updates.sections = clean;
      }

      if (lastUpdated !== undefined && lastUpdated !== null && lastUpdated !== '') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(lastUpdated)) || Number.isNaN(Date.parse(lastUpdated))) {
          return errorResponse(res, 'last_updated must be a valid date (YYYY-MM-DD).', null, 400);
        }
        updates.lastUpdated = String(lastUpdated);
      } else if (Object.keys(updates).length) {
        // any content change stamps today's date unless the admin picked one
        updates.lastUpdated = todayIso();
      }

      if (!Object.keys(updates).length) return errorResponse(res, 'Nothing to update.', null, 400);

      await page.update(updates);
      return successResponse(res, 'Legal page updated successfully.', format(page));
    } catch (error) {
      return errorResponse(res, error.message, null, 500);
    }
  }
}

module.exports = new LegalController();
