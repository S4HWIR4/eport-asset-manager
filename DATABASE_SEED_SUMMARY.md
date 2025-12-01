# Database Seed Summary

## Overview
The database has been successfully seeded with users, categories, departments, assets, and audit logs.

## Users (6 Total)

### Admin User
- **Email**: dev.sahwira@gmail.com
- **Role**: Admin
- **Assets**: 3

### Regular Users
1. **Rumbi** - rumbi@eport.cloud
   - Assets: 2

2. **Moses Marimo** - moses.marimo@eport.cloud
   - Title: Head of Development
   - Department: IT Department
   - Assets: 2
   - Password: Password123

3. **Bruce Francis** - bruce.francis@eport.cloud
   - Title: Head of Product
   - Department: Marketing
   - Assets: 2
   - Password: Password123

4. **Sibs Sibanda** - sibs.sibanda@eport.cloud
   - Title: Head of Operations
   - Department: Operations
   - Assets: 2
   - Password: Password123

5. **Chris Zana** - chris.zana@eport.cloud
   - Department: Finance
   - Assets: 2
   - Password: Password123

## Categories (5)
- Computer Equipment
- Office Furniture
- Vehicles
- Software Licenses
- Network Equipment

## Departments (5)
- IT Department
- Human Resources
- Finance
- Operations
- Marketing

## Assets (13 Total)

### Admin's Assets (3)
1. Dell Latitude 5520 Laptop - $1,299.99 (IT Department)
2. Executive Office Desk - $899.50 (Human Resources)
3. Toyota Camry 2023 - $28,500.00 (Operations)

### Rumbi's Assets (2)
1. Microsoft Office 365 License - $149.99 (Finance)
2. Cisco Catalyst 48-Port Switch - $2,499.00 (IT Department)

### Moses Marimo's Assets (2)
1. MacBook Pro 16" M3 - $2,499.00 (IT Department)
2. Dell UltraSharp 27" Monitor - $549.99 (IT Department)

### Bruce Francis's Assets (2)
1. Adobe Creative Cloud License - $599.88 (Marketing)
2. Canon EOS R6 Camera - $2,499.00 (Marketing)

### Sibs Sibanda's Assets (2)
1. Toyota Hilux 2024 - $35,000.00 (Operations)
2. Warehouse Management System License - $1,200.00 (Operations)

### Chris Zana's Assets (2)
1. QuickBooks Enterprise License - $1,850.00 (Finance)
2. HP LaserJet Pro Printer - $399.99 (Finance)

## Audit Logs (13 Total)
All assets have corresponding "asset_created" audit log entries with complete entity data including:
- Asset name
- Cost
- Purchase date
- Category ID
- Department ID
- Created by user ID

## Scripts Available

### Cleanup Script
```bash
node scripts/cleanup-database.mjs
```
Removes all data except the 2 original users (dev.sahwira@gmail.com and rumbi@eport.cloud)

### Initial Seed Script
```bash
node scripts/seed-database.mjs
```
Seeds 5 categories, 5 departments, and 5 assets (3 by admin, 2 by user)

### Additional Users Seed Script
```bash
node scripts/seed-additional-users.mjs
```
Adds 3 new users (Moses, Bruce, Sibs) with 2 assets each

### Add Chris Zana Script
```bash
node scripts/add-chris-zana.mjs
```
Adds Chris Zana with 2 assets in Finance department

### Check Audit Logs Script
```bash
node scripts/check-audit-logs.mjs
```
Displays recent audit log entries

## Total Value of Assets
- Admin: $30,699.49
- Rumbi: $2,648.99
- Moses Marimo: $3,048.99
- Bruce Francis: $3,098.88
- Sibs Sibanda: $36,200.00
- Chris Zana: $2,249.99

**Grand Total**: $77,946.34
