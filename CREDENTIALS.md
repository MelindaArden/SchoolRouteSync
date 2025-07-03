# School Bus Management System - Login Credentials

## Driver Accounts

### John Smith (Driver)
- **Username:** `driver1`
- **Password:** `password123`
- **Role:** Driver

### Melinda Arden (Driver)
- **Username:** `ma1313`
- **Password:** `Dietdew13!`
- **Role:** Driver

### Sarah Johnson (Driver)
- **Username:** `driver2`
- **Password:** `password123`
- **Role:** Driver

## Admin/Leadership Accounts

### Chad Wiggnis (Admin)
- **Username:** `ChadW`
- **Password:** `Password123`
- **Role:** Leadership

### DeShaun Holden (Admin)
- **Username:** `DeShaun`
- **Password:** `Password123`
- **Role:** Leadership

### Melinda Arden (Admin)
- **Username:** `Melinda`
- **Password:** `Password123`
- **Role:** Leadership

## Testing Notes

- All credentials are case-sensitive
- The login system now uses proper session management for mobile Safari compatibility
- Sessions persist across browser refreshes and mobile app switching
- Both driver and admin dashboards are fully functional with their respective user roles

## Mobile Testing

The application has been specifically optimized for mobile Safari login issues. Test on mobile devices using any of the above credentials to verify the session management works correctly.

### Mobile Safari Debugging

If you experience login issues on mobile Safari, visit `/mobile-debug` in your browser for comprehensive diagnostics:

1. Go to `[your-app-url]/mobile-debug`
2. Enter your credentials (defaults to ma1313/Dietdew13!)
3. Click "Test Login & Session" to run diagnostics
4. Review the detailed output to identify any issues

### Mobile Safari Features

- Enhanced session management with mobile-specific cookie settings
- Dual login endpoints: `/api/login` and `/api/mobile-login`
- Automatic mobile browser detection and fallback mechanisms
- Comprehensive error logging and debugging information
- Token-based backup authentication for mobile Safari compatibility

### Troubleshooting Steps

1. Test both regular and mobile login endpoints
2. Check session creation and persistence
3. Verify cookies are being set correctly
4. Review user agent detection and mobile-specific handling