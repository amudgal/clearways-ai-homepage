# ClearWays AI Backend API

Backend API server for the ClearWays AI TCO Analysis Platform with PostgreSQL database on AWS RDS.

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your AWS RDS credentials:

```bash
cp .env.example .env
```

Edit `.env` with your AWS RDS PostgreSQL credentials:
- `DB_HOST`: Your RDS endpoint (e.g., `your-db.region.rds.amazonaws.com`)
- `DB_PORT`: Usually `5432`
- `DB_NAME`: Your database name
- `DB_USER`: Your database username
- `DB_PASSWORD`: Your database password
- `JWT_SECRET`: A secure random string for JWT tokens

### 3. Run Database Migration

```bash
npm run migrate
```

This will:
- Create all necessary tables
- Set up indexes
- Create default tenants (ClearWays AI and American Express)

### 4. Start Development Server

```bash
npm run dev
```

The server will run on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/otp/send` - Send OTP to email
- `POST /api/auth/otp/verify` - Verify OTP and get JWT token
- `GET /api/auth/me` - Get current user

### Analysis
- `GET /api/analysis` - Get all analyses (tenant-isolated)
- `GET /api/analysis/:id` - Get single analysis
- `POST /api/analysis` - Create new LIVE analysis
- `PUT /api/analysis/:id/inputs` - Update inputs and recompute
- `POST /api/analysis/:id/save` - Save analysis (LIVE → SAVED)
- `POST /api/analysis/:id/lock` - Lock analysis (SAVED → LOCKED)
- `POST /api/analysis/:id/unlock` - Unlock analysis (admin only)

### Pricing
- `GET /api/pricing/version/active` - Get active pricing version
- `GET /api/pricing/:provider` - Get pricing for provider (AWS/GCP/Azure)

### Admin
- `GET /api/admin/pricing/versions` - Get all pricing versions
- `POST /api/admin/pricing/versions` - Create new pricing version
- `GET /api/admin/pricing/:versionId/:provider` - Get pricing data
- `POST /api/admin/pricing` - Create/update pricing entry
- `DELETE /api/admin/pricing/:id` - Delete pricing entry
- `GET /api/admin/audit-logs` - Get audit logs

## Database Schema

See `src/db/schema.sql` for the complete database schema.

## Security Features

- JWT-based authentication
- Tenant isolation enforced at database level
- RBAC (Role-Based Access Control) for admin operations
- Audit logging for all sensitive operations
- SQL injection protection via parameterized queries

## Production Deployment

1. Set `NODE_ENV=production`
2. Use secure JWT secret
3. Configure proper CORS origins
4. Set up SSL for database connection
5. Use environment-specific database credentials
6. Enable connection pooling
7. Set up monitoring and logging

