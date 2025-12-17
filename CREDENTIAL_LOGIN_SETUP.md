# Credential-Based Login System

This document explains how to set up and use the credential-based login system for users who don't have corporate email addresses.

## Overview

The system now supports two login methods:
1. **OTP-based login** (existing) - For users with corporate email addresses
2. **Credential-based login** (new) - For users with username/password credentials

## Database Migration

First, run the database migration to add the required fields:

```bash
cd server
tsx src/db/add_credential_users.ts
```

Or manually run the SQL:
```sql
ALTER TABLE site_users 
ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;

ALTER TABLE site_users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_site_users_username ON site_users(username) WHERE username IS NOT NULL;
```

## Admin API Endpoints

### Create Credential User

**POST** `/api/admin/credential-users`

**Headers:**
- `Authorization: Bearer <admin_token>`

**Body:**
```json
{
  "username": "amex_user1",
  "password": "SecurePassword123",
  "email": "user@example.com",  // Optional
  "tenant_id": "<tenant-uuid>",  // Required - assign to client (e.g., Amex)
  "role": "USER"  // Optional, defaults to "USER"
}
```

**Response:**
```json
{
  "user": {
    "id": "...",
    "username": "amex_user1",
    "email": "user@example.com",
    "domain": "example.com",
    "tenant_id": "...",
    "role": "USER",
    "created_at": "..."
  }
}
```

### Get All Credential Users

**GET** `/api/admin/credential-users`

**Headers:**
- `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "users": [
    {
      "id": "...",
      "username": "amex_user1",
      "email": "user@example.com",
      "domain": "example.com",
      "tenant_id": "...",
      "role": "USER",
      "tenant_name": "American Express",
      "created_at": "...",
      "last_login_at": "..."
    }
  ]
}
```

### Update Credential User

**PUT** `/api/admin/credential-users/:id`

**Headers:**
- `Authorization: Bearer <admin_token>`

**Body:** (all fields optional)
```json
{
  "username": "new_username",
  "password": "NewPassword123",
  "email": "newemail@example.com",
  "tenant_id": "<new-tenant-uuid>",
  "role": "USER"
}
```

### Delete Credential User

**DELETE** `/api/admin/credential-users/:id`

**Headers:**
- `Authorization: Bearer <admin_token>`

## User Login

### Credential Login Endpoint

**POST** `/api/auth/credentials/login`

**Body:**
```json
{
  "username": "amex_user1",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "amex_user1",
    "email": "user@example.com",
    "tenant_id": "...",
    "role": "USER",
    "domain": "example.com"
  },
  "token": "jwt_token_here",
  "message": "Authentication successful"
}
```

## Frontend Usage

### Login Screen

The login screen now has two tabs:
1. **Email OTP** - For corporate email users (existing)
2. **Have Credentials** - For username/password users (new)

Users can toggle between the two methods using the buttons at the top of the login form.

### User Capabilities

Credential users have the same capabilities as OTP users:
- ✅ Create new analyses
- ✅ Save analyses
- ✅ Edit analyses published for their tenant/client
- ✅ View all analyses for their assigned tenant
- ✅ Export PDF reports

## Example: Creating a User for Amex

1. **Get the Amex tenant ID:**
   ```bash
   GET /api/admin/tenants
   # Find the tenant with name "American Express" or domain "amex.com"
   ```

2. **Create the credential user:**
   ```bash
   POST /api/admin/credential-users
   {
     "username": "amex_analyst1",
     "password": "AmexSecure2024!",
     "email": "analyst1@amex.com",  // Optional
     "tenant_id": "<amex-tenant-uuid>",
     "role": "USER"
   }
   ```

3. **Share credentials with the user:**
   - Username: `amex_analyst1`
   - Password: `AmexSecure2024!`
   - Login URL: `https://clearways.ai/login`

4. **User logs in:**
   - Goes to login page
   - Clicks "Have Credentials" tab
   - Enters username and password
   - Gains access to all Amex analyses

## Security Notes

- Passwords are hashed using bcrypt (10 salt rounds)
- Usernames must be 3-50 characters (alphanumeric + underscore)
- Passwords must be at least 8 characters
- All credential logins are logged in the audit log
- Users are assigned to specific tenants (clients) and can only access their tenant's data

## Tenant Assignment

When creating a credential user, you must assign them to a tenant (client). This ensures:
- Users can only see analyses for their assigned client
- Users can edit analyses published for their client
- Proper data isolation between clients

To assign a user to a different client, update their `tenant_id` using the update endpoint.

