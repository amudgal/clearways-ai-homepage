# Backend Setup Guide

## Quick Start with AWS RDS PostgreSQL

### Step 1: Get Your AWS RDS Credentials

You'll need:
- **DB_HOST**: Your RDS endpoint (e.g., `clearways-db.region.rds.amazonaws.com`)
- **DB_PORT**: Usually `5432`
- **DB_NAME**: Your database name (e.g., `clearways_db`)
- **DB_USER**: Your database username
- **DB_PASSWORD**: Your database password

### Step 2: Configure Environment Variables

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your AWS RDS credentials:
   ```env
   DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
   DB_PORT=5432
   DB_NAME=clearways_db
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_SSL=true
   
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   CORS_ORIGIN=http://localhost:3000
   ```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Run Database Migration

This will create all tables and set up the database schema:

```bash
npm run migrate
```

### Step 5: Start the Server

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

The server will run on `http://localhost:3001`

## Database Schema

The migration creates the following tables:
- `tenants` - Tenant information
- `users` - User accounts with tenant association
- `pricing_versions` - Pricing version management
- `cloud_pricing` - Cloud provider pricing data (AWS/GCP/Azure)
- `analyses` - TCO analysis records
- `analysis_inputs` - Analysis input parameters
- `analysis_computed_results` - Computed analysis results
- `audit_logs` - Audit trail for all operations
- `otp_store` - OTP codes for authentication

## API Configuration

Update your frontend `.env` or `vite.config.ts` to point to the backend:

```env
VITE_API_URL=http://localhost:3001/api
```

## Admin Access

Users with email domain `@clearways.ai` automatically get ADMIN role.

To access the admin pricing management page:
1. Log in with a `@clearways.ai` email
2. Navigate to `/admin/pricing`
3. Create pricing versions and manage cloud provider pricing

## Testing the Connection

1. Check health endpoint: `http://localhost:3001/health`
2. Should return: `{ status: 'healthy', database: 'connected' }`

## Troubleshooting

### Database Connection Issues

1. **Check RDS Security Group**: Ensure your IP is allowed in the RDS security group
2. **Check SSL**: If SSL is required, ensure `DB_SSL=true` in `.env`
3. **Check Endpoint**: Verify the RDS endpoint is correct
4. **Check Credentials**: Verify username and password are correct

### Migration Errors

If migration fails:
1. Check database connection
2. Ensure you have CREATE TABLE permissions
3. Check if tables already exist (may need to drop and recreate)

### CORS Issues

If frontend can't connect:
1. Update `CORS_ORIGIN` in `.env` to match your frontend URL
2. Restart the server after changing `.env`

## Next Steps

1. Set up initial pricing data via admin panel
2. Configure email service for OTP (optional, currently logs to console)
3. Set up production environment variables
4. Deploy to AWS (EC2, ECS, or Lambda)

