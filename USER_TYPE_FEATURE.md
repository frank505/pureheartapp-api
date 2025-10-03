# User Type Feature

## Overview
This feature allows users to specify their type as either `user` or `partner` during authentication (Google/Apple) or update it later through a dedicated endpoint. This enables the application to provide different UI/UX based on the user's type.

## Database Schema

### Migration
A migration file has been created to add the `userType` field to the `users` table:
- **File**: `migrations/add_user_type_to_users.sql`
- **Column**: `userType ENUM('user', 'partner') DEFAULT 'user'`
- **Index**: Added for performance optimization

### Running the Migration
```bash
# Execute the migration SQL file against your database
mysql -u <username> -p christian_recovery_db < migrations/add_user_type_to_users.sql
```

## API Changes

### 1. Google Login (`POST /api/auth/google-login`)
**New Parameter:**
```typescript
{
  idToken: string;
  onboardingData: OnboardingState;
  userType?: 'user' | 'partner';  // NEW - Optional parameter
  // ... other existing parameters
}
```

**Behavior:**
- If `userType` is provided during registration, it will be stored
- If `userType` is provided for existing users, it will update their type
- Defaults to `'user'` if not provided during registration

### 2. Apple Login (`POST /api/auth/apple-login`)
**New Parameter:**
```typescript
{
  idToken: string;
  onboardingData: OnboardingState;
  userType?: 'user' | 'partner';  // NEW - Optional parameter
  // ... other existing parameters
}
```

**Behavior:**
- Same as Google login above

### 3. Update User Type (`PATCH /api/auth/user-type`)
**New Endpoint** - Allows authenticated users to change their user type at any time.

**Request:**
```typescript
PATCH /api/auth/user-type
Headers: {
  Authorization: Bearer <jwt_token>
}
Body: {
  userType: 'user' | 'partner'  // REQUIRED
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User type updated successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "userType": "partner",
      // ... other user fields
    },
    "userType": "partner"
  },
  "statusCode": 200
}
```

**Error Responses:**
- **400 Bad Request**: Invalid userType value
- **404 Not Found**: User not found
- **401 Unauthorized**: Invalid or missing JWT token
- **500 Internal Server Error**: Server error

## User Model Changes

The `User` model now includes:
```typescript
public userType!: UserType; // 'user' | 'partner'
```

The `toPublicJSON()` method now returns the `userType` field:
```typescript
{
  // ... existing fields
  userType: 'user' | 'partner'
}
```

## Type Definitions

### New Type
```typescript
export type UserType = 'user' | 'partner';
```

### Updated Interfaces
- `IUser` - Added `userType: UserType`
- `IUserPublic` - Added `userType: 'user' | 'partner'`
- `IGoogleLoginRequest` - Added `userType?: 'user' | 'partner'`
- `IAppleLoginRequest` - Added `userType?: 'user' | 'partner'`

## Usage Examples

### Frontend - Setting userType during Google Authentication
```typescript
const loginWithGoogle = async (idToken: string, userTypeFromStorage: 'user' | 'partner') => {
  const response = await fetch('/api/auth/google-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken,
      onboardingData: { /* ... */ },
      userType: userTypeFromStorage || 'user'
    })
  });
  
  const data = await response.json();
  console.log('User type:', data.user.userType);
};
```

### Frontend - Setting userType during Apple Authentication
```typescript
const loginWithApple = async (idToken: string, userTypeFromStorage: 'user' | 'partner') => {
  const response = await fetch('/api/auth/apple-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken,
      onboardingData: { /* ... */ },
      userType: userTypeFromStorage || 'user'
    })
  });
  
  const data = await response.json();
  console.log('User type:', data.user.userType);
};
```

### Frontend - Updating userType after authentication
```typescript
const updateUserType = async (newType: 'user' | 'partner', jwtToken: string) => {
  const response = await fetch('/api/auth/user-type', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify({
      userType: newType
    })
  });
  
  const data = await response.json();
  if (data.success) {
    console.log('User type updated to:', data.data.userType);
    // Update UI based on new user type
  }
};
```

### Frontend - Conditional UI based on userType
```typescript
const renderDashboard = (user: IUserPublic) => {
  if (user.userType === 'partner') {
    return <PartnerDashboard />;
  } else {
    return <UserDashboard />;
  }
};
```

## Testing Checklist

- [ ] Run the database migration
- [ ] Test Google login with `userType: 'user'`
- [ ] Test Google login with `userType: 'partner'`
- [ ] Test Apple login with `userType: 'user'`
- [ ] Test Apple login with `userType: 'partner'`
- [ ] Test Google/Apple login without userType (should default to 'user')
- [ ] Test updating userType via PATCH endpoint
- [ ] Verify userType is returned in all user responses
- [ ] Test that existing users can update their userType during re-authentication
- [ ] Verify conditional UI rendering based on userType

## Notes

1. **Default Value**: If `userType` is not provided during registration, it defaults to `'user'`.
2. **Update on Login**: Existing users can update their `userType` by passing it during login.
3. **Backward Compatibility**: Existing users in the database will have `userType` set to `'user'` by default after migration.
4. **Security**: The update endpoint requires authentication via JWT token.
5. **Validation**: Both endpoints validate that `userType` is either `'user'` or `'partner'`.
