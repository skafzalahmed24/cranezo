'use strict';

const crypto = require('crypto');

// Placeholder image that ships with the repo, so photos/documents render in the admin panel
const SAMPLE_FILE = '/public/roles/owner.png';

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);

// approval: 0 under review, 1 verified, 2 rejected
const SAMPLE_CRANES = [
  { reg: 'SAMPLE-TN-09-AB-1001', type: 'Mobile Crane', capacity: '50 Ton', fuel: 'Diesel', model: 'Liebherr LTM 1050', location: 'Chennai, TN', rate: 5000, minHours: 4, approval: 1, submitted: hoursAgo(120), operator: true },
  { reg: 'SAMPLE-KA-01-CD-2002', type: 'Rough Terrain Crane', capacity: '100 Ton', fuel: 'Diesel', model: 'Grove GRT 1000', location: 'Bengaluru, KA', rate: 8500, minHours: 4, approval: 1, submitted: hoursAgo(96), operator: false },
  { reg: 'SAMPLE-TS-07-EF-3003', type: 'Crawler Crane', capacity: '150 Ton', fuel: 'Diesel', model: 'Sany SCC1500', location: 'Hyderabad, TS', rate: 12000, minHours: 6, approval: 0, submitted: hoursAgo(30), operator: true },
  { reg: 'SAMPLE-TN-38-GH-4004', type: 'Truck Mounted Crane', capacity: '80 Ton', fuel: 'Diesel', model: 'Tadano GT-800', location: 'Coimbatore, TN', rate: 6500, minHours: 4, approval: 0, submitted: hoursAgo(2), operator: false },
  { reg: 'SAMPLE-MH-12-IJ-5005', type: 'All Terrain Crane', capacity: '200 Ton', fuel: 'Diesel', model: 'Liebherr LTM 1200', location: 'Mumbai, MH', rate: 15000, minHours: 8, approval: 2, submitted: hoursAgo(50), operator: false, reason: 'Fitness certificate is expired. Please upload a valid certificate and resubmit.' }
];

module.exports = {
  up: async (queryInterface) => {
    const q = async (sql) => (await queryInterface.sequelize.query(sql))[0];

    const [owner] = await q('SELECT id FROM users WHERE role_id = 1 AND is_deleted = 0 ORDER BY created_at LIMIT 1');
    if (!owner) {
      console.log('No crane owner (role 1) found; run the sample users seeder first. Skipping sample cranes.');
      return;
    }
    const [operator] = await q('SELECT id FROM users WHERE role_id = 2 AND is_deleted = 0 ORDER BY created_at LIMIT 1');
    const [admin] = await q('SELECT id FROM admins ORDER BY created_at LIMIT 1');

    const dropdowns = await q('SELECT id, dropdown_name, dropdown_type FROM static_dropdowns WHERE dropdown_type IN (6, 7, 8, 9)');
    const find = (type, name) => {
      const row = dropdowns.find((d) => d.dropdown_type === type && d.dropdown_name === name);
      if (!row) throw new Error(`Dropdown "${name}" (type ${type}) missing; run the crane dropdowns seeder first.`);
      return row.id;
    };
    const docTypeIds = dropdowns.filter((d) => d.dropdown_type === 9).map((d) => d.id);

    const [{ max }] = await q("SELECT COALESCE(MAX(CAST(SUBSTRING(crane_code FROM 4) AS INTEGER)), 0) AS max FROM cranes WHERE crane_code ~ '^CRN[0-9]+$'");
    let nextNumber = Number(max);

    for (const sample of SAMPLE_CRANES) {
      const [existing] = await q(`SELECT id FROM cranes WHERE registration_number = '${sample.reg}'`);
      if (existing) continue;

      const id = crypto.randomUUID();
      const reviewed = sample.approval !== 0;
      nextNumber += 1;

      await queryInterface.bulkInsert('cranes', [{
        id,
        crane_code: `CRN${String(nextNumber).padStart(3, '0')}`,
        owner_id: owner.id,
        crane_type: find(6, sample.type),
        capacity: find(7, sample.capacity),
        fuel_type: find(8, sample.fuel),
        model_name: sample.model,
        registration_number: sample.reg,
        location: sample.location,
        hourly_rate: sample.rate,
        minimum_hours: sample.minHours,
        operator_id: sample.operator && operator ? operator.id : null,
        availability_status: 0,
        approval_status: sample.approval,
        rejection_reason: sample.reason || null,
        submitted_at: sample.submitted,
        reviewed_at: reviewed ? new Date(sample.submitted.getTime() + 20 * 3600 * 1000) : null,
        reviewed_by: reviewed && admin ? admin.id : null,
        is_active: 0,
        created_at: sample.submitted,
        updated_at: new Date()
      }]);

      await queryInterface.bulkInsert('crane_photos', [0, 1].map((sortOrder) => ({
        crane_id: id,
        photo_url: SAMPLE_FILE,
        sort_order: sortOrder,
        created_at: new Date(),
        updated_at: new Date()
      })));

      await queryInterface.bulkInsert('crane_documents', docTypeIds.map((documentType) => ({
        crane_id: id,
        document_type: documentType,
        file_url: SAMPLE_FILE,
        expiry_date: '2027-08-12',
        created_at: new Date(),
        updated_at: new Date()
      })));
    }
  },

  down: async (queryInterface) => {
    // crane_photos / crane_documents are removed by ON DELETE CASCADE
    await queryInterface.sequelize.query("DELETE FROM cranes WHERE registration_number LIKE 'SAMPLE-%'");
  }
};
