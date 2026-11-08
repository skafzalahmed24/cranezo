const defaultToken = process.env.DEFAULT_AUTH_TOKEN || '';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Cranezo Heavy Lifting & Crane Telemetry API',
    version: '1.0.0',
    description: `
### Cranezo Platform API Documentation

Official REST API documentation for the **Cranezo Heavy Lifting & Crane Dispatch Platform**.

#### 🔑 Authentication Instructions:
To access protected endpoints:
1. Click the **Authorize** 🔓 button on the right.
2. The default token is pre-configured from your \`.env\` file (**DEFAULT_AUTH_TOKEN**):
\`\`\`
${defaultToken}
\`\`\`
3. Paste the token into the **Value** field and click **Authorize**.
`,
    contact: {
      name: 'Cranezo API Support',
      email: 'support@cranezo.com',
      url: 'https://cranezo.com'
    }
  },
  servers: [
    {
      url: '/',
      description: 'Current Domain / Relative (Works on localhost and production)'
    },
    {
      url: 'https://cranezo.com',
      description: 'Production HTTPS (cranezo.com)'
    },
    {
      url: 'http://cranezo.com:5000',
      description: 'Production Direct Port (cranezo.com:5000)'
    },
    {
      url: `http://localhost:${process.env.PORT || 5000}`,
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token as: Bearer <JWT>'
      }
    }
  },
  tags: [
    { name: 'System', description: 'Platform health and connectivity diagnostics' },
    { name: 'Authentication', description: 'Admin & user login, registration, and session verification' },
    { name: 'Admin', description: 'Super Admin operations and dashboard analytics' },
    { name: 'Dropdowns & Metadata', description: 'Static dropdowns, languages, and app metadata' },
    { name: 'Roles', description: 'Roles management with descriptions and visual badges' },
    { name: 'File Upload', description: 'Single (type=1) and multiple (type=2) file upload with timestamps' }
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Platform Health Check',
        description: 'Verify backend API connectivity and operational telemetry status',
        responses: {
          200: {
            description: 'System is online',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ONLINE' },
                    service: { type: 'string', example: 'Cranezo Heavy Lifting API' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/registerOrLogin': {
      post: {
        tags: ['Authentication'],
        summary: 'Mobile Sign In / Sign Up (OTP Request)',
        description: 'Initiate mobile onboarding. Accepts language_id, country_code, and phone_number. Generates and returns a random 6-digit OTP.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone_number'],
                properties: {
                  phone_number: { type: 'string', example: '9876543210' },
                  country_code: { type: 'string', example: '+91' },
                  language_id: { type: 'integer', example: 1, description: '1: English, 2: Telugu, 3: Hindi' },
                  device_id: { type: 'string', example: 'DEV-HYD-9981' },
                  platform_type: { type: 'string', example: 'ANDROID' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'OTP generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 1 },
                    message: { type: 'string', example: 'OTP generated and sent successfully.' },
                    data: {
                      type: 'object',
                      properties: {
                        user_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
                        country_code: { type: 'string', example: '+91' },
                        phone_number: { type: 'string', example: '9876543210' },
                        member_id: { type: 'string', example: 'ONR659897', description: 'Unique member ID (OP/CUST/ONR + 6 digits)' },
                        role_id: { type: 'integer', example: 1 },
                        otp: { type: 'string', example: '123456' },
                        is_new_user: { type: 'boolean', example: false }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Missing required parameters' }
        }
      }
    },
    '/api/auth/verifyOtp': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Mobile OTP',
        description: 'Verifies OTP against user uuid. Returns role status: role_id_status = 0 (user already has role assigned), role_id_status = 1 (user has no role assigned). Generates JWT token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user_id', 'otp_number'],
                properties: {
                  user_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
                  otp_number: { type: 'string', example: '123456' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'OTP verified successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 1 },
                    message: { type: 'string', example: 'OTP verified successfully.' },
                    data: {
                      type: 'object',
                      properties: {
                        user_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
                        member_id: { type: 'string', example: 'ONR659897' },
                        phone_number: { type: 'string', example: '9876543210' },
                        is_mobile_verified: { type: 'integer', example: 0 },
                        role_id_status: { type: 'integer', example: 0, description: '0 for already have role, 1 for does not have role' },
                        has_role: { type: 'integer', example: 0 },
                        role_id: { type: 'integer', example: 1 },
                        role_name: { type: 'string', example: 'Crane Owner' },
                        full_name: { type: 'string', example: 'Vikram Reddy' },
                        company_name: { type: 'string', example: 'Reddy Heavy Crane Logistics Pvt Ltd' },
                        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                        refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                        token_type: { type: 'string', example: 'Bearer' },
                        expires_in: { type: 'string', example: '1d' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid or expired OTP' }
        }
      }
    },
    '/api/auth/updateProfile': {
      post: {
        tags: ['Authentication'],
        summary: 'Update / Complete Profile with Role',
        description: [
          'Complete user onboarding profile. user_id, role_id and full_name are always required. The remaining required fields depend on role_id. Refreshes the JWT token with the new role.',
          '',
          '**Crane Owner (role_id 1):** company_name required. Optional: owner_type, years_of_experience, number_of_business_partners, business_ownership_type, business_address, city, state, pincode, user_email.',
          '',
          '**Operator (role_id 2):** operator_license_number, license_expiry_date (YYYY-MM-DD, must not be expired), years_of_experience (dropdown type 3), operator_type (dropdown type 10), operator_license_front and operator_license_back (file urls from POST /api/upload). If operator_type is *Owner Based*, owner_id (the crane owner member id, e.g. ONR123456) is required. Optional: profile_image, aadhar_card_file, pan_card_file, other_document_file.',
          '',
          '**Customer (role_id 3):** customer_type (dropdown type 11) required. *Business User*: company_name, business_address, constitution (type 12), company_date_establishment, gst_number, nature_of_business (type 13); optional directors_details, finance_head_details, branch_offices_details. *Individual User*: aadhar_number (12 digits), pan_number, city, state_id (type 14).',
          '',
          'Fetch every dropdown with POST /api/dropdowns { "type": N }.'
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user_id', 'role_id', 'full_name'],
                properties: {
                  user_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
                  role_id: { type: 'integer', example: 1, description: '1: Crane Owner, 2: Operator, 3: Customer' },
                  full_name: { type: 'string', example: 'Vikram Reddy' },
                  company_name: { type: 'string', example: 'Reddy Heavy Crane Logistics Pvt Ltd' },
                  owner_type: { type: 'integer', example: 4, description: 'Dropdown ID for Owner Type' },
                  years_of_experience: { type: 'integer', example: 12, description: 'Dropdown ID for Years of Experience' },
                  number_of_business_partners: { type: 'integer', example: 16, description: 'Dropdown ID for Partners Count' },
                  business_ownership_type: { type: 'integer', example: 22, description: 'Dropdown ID for Ownership Entity' },
                  business_address: { type: 'string', example: 'Plot 45, Industrial Area, Patancheru' },
                  city: { type: 'string', example: 'Hyderabad' },
                  state: { type: 'string', example: 'Telangana' },
                  pincode: { type: 'string', example: '502319' },
                  user_email: { type: 'string', format: 'email', example: 'vikram@reddycranes.com' },
                  profile_image: { type: 'string', example: '/public/uploads/profile.png', description: 'Optional photo url from POST /api/upload' },

                  operator_license_number: { type: 'string', example: 'TS0920190012345', description: 'Operator only' },
                  license_expiry_date: { type: 'string', format: 'date', example: '2030-05-20', description: 'Operator only' },
                  operator_type: { type: 'integer', example: 50, description: 'Operator only. Dropdown type 10: Individual Operator / Owner Based' },
                  owner_id: { type: 'string', example: 'ONR659897', description: 'Operator only, required when Owner Based. Crane owner member id' },
                  operator_license_front: { type: 'string', example: '/public/uploads/license-front.png', description: 'Operator only' },
                  operator_license_back: { type: 'string', example: '/public/uploads/license-back.png', description: 'Operator only' },
                  aadhar_card_file: { type: 'string', example: '/public/uploads/aadhar.png', description: 'Operator only, optional' },
                  pan_card_file: { type: 'string', example: '/public/uploads/pan.png', description: 'Operator only, optional' },
                  other_document_file: { type: 'string', example: '/public/uploads/other.pdf', description: 'Operator only, optional' },

                  customer_type: { type: 'integer', example: 53, description: 'Customer only. Dropdown type 11: Individual User / Business User' },
                  constitution: { type: 'integer', example: 56, description: 'Business customer. Dropdown type 12' },
                  nature_of_business: { type: 'integer', example: 61, description: 'Business customer. Dropdown type 13' },
                  company_date_establishment: { type: 'string', format: 'date', example: '2015-04-01', description: 'Business customer' },
                  gst_number: { type: 'string', example: '36ABCDE1234F1Z5', description: 'Business customer' },
                  directors_details: { type: 'string', description: 'Business customer, optional. Name and address of directors / partners' },
                  finance_head_details: { type: 'string', description: 'Business customer, optional. Accounts / finance head details' },
                  branch_offices_details: { type: 'string', description: 'Business customer, optional' },
                  aadhar_number: { type: 'string', example: '123412341234', description: 'Individual customer' },
                  pan_number: { type: 'string', example: 'ABCDE1234F', description: 'Individual customer' },
                  state_id: { type: 'integer', example: 70, description: 'Individual customer. Dropdown type 14 (state)' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'User profile updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 1 },
                    message: { type: 'string', example: 'User profile and role updated successfully.' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { type: 'object' },
                        member_id: { type: 'string', example: 'ONR659897' },
                        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                        refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                        token_type: { type: 'string', example: 'Bearer' },
                        expires_in: { type: 'string', example: '1d' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Missing required fields or invalid role' }
        }
      }
    },
    '/api/auth/refreshToken': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh JWT Access Token',
        description: 'Provide valid refresh_token to obtain a new access_token and refresh_token pair.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refresh_token'],
                properties: {
                  refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 1 },
                    message: { type: 'string', example: 'Token refreshed successfully.' },
                    data: {
                      type: 'object',
                      properties: {
                        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                        refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                        token_type: { type: 'string', example: 'Bearer' },
                        expires_in: { type: 'string', example: '1d' }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Invalid or expired refresh token' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Admin & User Sign In',
        description: 'Authenticate with email and password to receive JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'superadmin@cranezo.com' },
                  password: { type: 'string', format: 'password', example: 'Admin@12345' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 1 },
                    message: { type: 'string', example: 'Login successful' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                        user: { type: 'object' }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Invalid email or password' }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register New Account',
        description: 'Create a new user or admin account in the system',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role_id'],
                properties: {
                  name: { type: 'string', example: 'Rahul Kumar' },
                  email: { type: 'string', format: 'email', example: 'rahul.kumar@example.com' },
                  password: { type: 'string', format: 'password', example: 'SecurePass123' },
                  role_id: { type: 'integer', example: 3, description: '1: Owner, 2: Operator, 3: Customer' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 1 },
                    message: { type: 'string', example: 'User registered successfully' },
                    data: { type: 'object' }
                  }
                }
              }
            }
          },
          400: { description: 'Validation error' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get Current Authenticated Profile',
        description: 'Retrieve profile details of currently logged-in admin or user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Profile retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 1 },
                    message: { type: 'string', example: 'Profile retrieved successfully' },
                    data: { type: 'object' }
                  }
                }
              }
            }
          },
          401: { description: 'Missing or invalid token' }
        }
      }
    },
    '/api/admin/dashboard-stats': {
      get: {
        tags: ['Admin'],
        summary: 'Get Admin Dashboard KPIs',
        description: 'Aggregates statistics for active cranes, users, fleet units, revenue, and telemetry status',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Dashboard stats retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 1 },
                    message: { type: 'string', example: 'Dashboard stats retrieved' },
                    data: { type: 'object' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/api/dropdowns': {
      post: {
        tags: ['Dropdowns & Metadata'],
        summary: 'Get Static Dropdowns',
        description: 'Retrieve static dropdown options using input body parameters (e.g. type: 1 for Languages, type: 2 for Owner Type, type: 3 for Experience Tiers, type: 4 for Partner Tiers, type: 5 for Ownership Types). Requires Bearer token (pre-configured with DEFAULT_AUTH_TOKEN).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: {
                    type: 'integer',
                    example: 2,
                    description: 'Dropdown category type (1: Languages, 2: Owner Type, 3: Years of Experience, 4: Partner Tiers, 5: Ownership Types)'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Dropdown list retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 1 },
                    message: { type: 'string', example: 'Static dropdown options retrieved successfully.' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer', example: 1 },
                          dropdownName: { type: 'string', example: 'Individual Business Owner' },
                          dropdownDescription: { type: 'string', example: 'Individual Business Owner' },
                          dropdownType: { type: 'integer', example: 2, description: '1: Languages, 2: Owner Type, 3: Experience, 4: Partners, 5: Ownership' },
                          dropdownTypeStatus: { type: 'integer', example: 0, description: '0: active, 1: inactive' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Access denied. Bearer token missing or invalid'
          }
        }
      }
    },
    '/api/roles': {
      get: {
        tags: ['Roles'],
        summary: 'Get Platform Roles',
        description: 'Retrieve active platform roles for onboarding and registration (Crane Owner, Operator, Customer). Super Admin (ID: 4) is excluded by default.',
        parameters: [
          {
            name: 'includeAdmin',
            in: 'query',
            description: 'Set to true if admin role needs to be included (default: false)',
            required: false,
            schema: { type: 'boolean', example: false }
          }
        ],
        responses: {
          200: {
            description: 'Roles retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 1 },
                    message: { type: 'string', example: 'Roles with descriptions and images retrieved successfully.' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer', example: 3 },
                          name: { type: 'string', example: 'Customer' },
                          code: { type: 'string', example: 'CUSTOMER' },
                          description: { type: 'string', example: 'Book cranes for your projects easily.' },
                          image: { type: 'string', example: '/public/roles/customer.png' },
                          isActive: { type: 'boolean', example: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/upload': {
      post: {
        tags: ['File Upload'],
        summary: 'Upload Single or Multiple Files',
        description: 'Upload files to the Cranezo platform. Pass type = 1 for single upload, or type = 2 for multiple upload. Files are stored in /public/uploads/ and returned with timestamps.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  type: {
                    type: 'integer',
                    enum: [1, 2],
                    example: 1,
                    description: '1 for single upload, 2 for multiple upload'
                  },
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Single file binary (used when type = 1)'
                  },
                  files: {
                    type: 'array',
                    items: {
                      type: 'string',
                      format: 'binary'
                    },
                    description: 'Multiple files binary (used when type = 2)'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'File(s) uploaded successfully with timestamp',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 1 },
                    message: { type: 'string', example: 'File uploaded successfully.' },
                    data: {
                      type: 'object',
                      properties: {
                        file_url: { type: 'string', example: '/public/uploads/profile-1792900000.png' },
                        file_name: { type: 'string', example: 'profile.png' },
                        stored_name: { type: 'string', example: 'profile-1792900000.png' },
                        file_path: { type: 'string', example: '/public/uploads/profile-1792900000.png' },
                        file_size: { type: 'integer', example: 204850 },
                        mime_type: { type: 'string', example: 'image/png' },
                        upload_type: { type: 'integer', example: 1 },
                        timestamp: { type: 'string', format: 'date-time', example: '2026-10-25T14:00:00.000Z' }
                      }
                    },
                    timestamp: { type: 'string', format: 'date-time', example: '2026-10-25T14:00:00.000Z' }
                  }
                }
              }
            }
          },
          400: { description: 'No file provided or invalid upload parameters' }
        }
      }
    }
  }
};

const craneDocs = require('./swagger.cranes');
const profileDocs = require('./swagger.profile');
const bookingDocs = require('./swagger.booking');
const operatorDocs = require('./swagger.operator');
const ownerJobDocs = require('./swagger.ownerjobs');
const customerJobDocs = require('./swagger.customerjobs');
const supportDocs = require('./swagger.support');
const homeDocs = require('./swagger.home');

swaggerDefinition.tags.push(...craneDocs.tags, ...profileDocs.tags, ...bookingDocs.tags, ...operatorDocs.tags, ...ownerJobDocs.tags, ...supportDocs.tags, ...homeDocs.tags);
// customerJobDocs goes last: it replaces the older booking/list and booking/get entries
Object.assign(swaggerDefinition.paths, craneDocs.paths, profileDocs.paths, bookingDocs.paths, operatorDocs.paths, ownerJobDocs.paths, customerJobDocs.paths, supportDocs.paths, homeDocs.paths);

module.exports = swaggerDefinition;
