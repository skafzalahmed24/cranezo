// Splits the full OpenAPI spec into separate docs, one per audience.
const fullSpec = require('./swagger');

const GROUPS = {
  auth: {
    path: '/api/docs/auth',
    title: 'Cranzo Authentication API',
    description: 'Login, OTP, token refresh and session endpoints.',
    tags: ['System', 'Authentication']
  },
  admin: {
    path: '/api/docs/admin',
    title: 'Cranzo Admin API',
    description: 'Admin dashboard, crane approvals and settings (dropdown management). Requires an admin Bearer token.',
    tags: ['Admin', 'Admin Crane Approvals', 'Admin Settings']
  },
  user: {
    path: '/api/docs/user',
    title: 'Cranzo User API',
    description: 'Endpoints used by the mobile apps (Crane Owner, Operator, Customer): crane management, dropdowns, roles and uploads.',
    tags: ['Owner Cranes', 'Dropdowns & Metadata', 'Roles', 'File Upload']
  }
};

const buildSpec = (group) => {
  const paths = {};
  Object.entries(fullSpec.paths).forEach(([url, operations]) => {
    const kept = {};
    Object.entries(operations).forEach(([method, op]) => {
      if (op.tags && op.tags.some((t) => group.tags.includes(t))) kept[method] = op;
    });
    if (Object.keys(kept).length) paths[url] = kept;
  });

  return {
    ...fullSpec,
    info: { ...fullSpec.info, title: group.title, description: `${group.description}\n\n${fullSpec.info.description}` },
    tags: fullSpec.tags.filter((t) => group.tags.includes(t.name)),
    paths
  };
};

const specs = Object.fromEntries(
  Object.entries(GROUPS).map(([key, group]) => [key, { ...group, spec: buildSpec(group) }])
);

module.exports = specs;
