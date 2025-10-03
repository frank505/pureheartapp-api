# Automatic Check-in System

## Overview

The automatic check-in system ensures users maintain their accountability streaks by automatically creating check-ins for users who haven't manually checked in by the end of their timezone day.

## Features

### Key Characteristics
- **Timezone Aware**: Processes check-ins based on user's timezone at the end of their day
- **No Partner Notifications**: Automatic check-ins don't notify accountability partners
- **Achievement Updates**: Users still receive achievement progress updates
- **Marked as Automatic**: All automatic check-ins are clearly labeled with `isAutomatic: true`
- **Default Status**: Automatic check-ins default to 'relapse' status since no manual input was provided

### Default Values for Automatic Check-ins
- **Mood**: 0.5 (neutral)
- **Note**: "Automatic check-in - no manual check-in recorded for this day"
- **Visibility**: 'private' (never shared with partners or groups)
- **Status**: 'relapse' (assumes user struggled since they didn't check in)
- **isAutomatic**: true (default value - automatic unless explicitly set to false)

## API Endpoints

### Enhanced Existing Endpoints
All check-in endpoints now include the `isAutomatic` field in responses:

```typescript
{
  "id": 123,
  "userId": 456,
  "mood": 0.5,
  "note": "Automatic check-in - no manual check-in recorded for this day",
  "visibility": "private",
  "status": "relapse",
  "isAutomatic": true,
  "createdAt": "2024-01-15T23:45:00.000Z",
  "updatedAt": "2024-01-15T23:45:00.000Z"
}
```

### New Filtering Endpoints

#### GET /accountability/checkins/manual
Retrieve only manual (user-created) check-ins
- Excludes automatic check-ins
- Same query parameters as regular `/checkins` endpoint

#### GET /accountability/checkins/automatic
Retrieve only automatic check-ins
- Shows system-generated check-ins only
- Useful for debugging and analytics

#### POST /accountability/admin/trigger-auto-checkins
Admin endpoint to manually trigger automatic check-ins for all timezones
- Useful for testing and manual processing
- Should be restricted to admin users in production

## Implementation Details

### Timezone Handling
The system supports various timezone formats:
- **Abbreviations**: EST, PST, GMT, UTC, JST, etc.
- **UTC Offset**: UTC+5, UTC-8, etc.
- **Simple Offset**: +5, -8, etc.

### Cron Schedule
Automatic check-ins are processed at 23:45 (11:45 PM) in each timezone:
- **UTC**: 23:45 UTC daily
- **EST (UTC-5)**: 04:45 UTC next day
- **PST (UTC-8)**: 07:45 UTC next day
- **CET (UTC+1)**: 22:45 UTC same day

### Processing Logic
1. **User Discovery**: Find all active users in the target timezone
2. **Check Existing**: Verify no check-in exists for the target date
3. **Create Automatic**: Generate check-in with default values
4. **Update Progress**: Maintain streaks and achievement progress
5. **No Notifications**: Skip partner/group notifications

### Batch Processing
- Users are processed in batches of 50 to avoid database overload
- 1-second delay between batches for system stability
- Uses Promise.allSettled for error resilience

## Database Changes

### New Column: `is_automatic`
```sql
ALTER TABLE accountability_checkins 
ADD COLUMN is_automatic BOOLEAN NOT NULL DEFAULT TRUE;

-- Indexes for performance
CREATE INDEX idx_accountability_checkins_is_automatic 
ON accountability_checkins(is_automatic);

CREATE INDEX idx_accountability_checkins_user_automatic 
ON accountability_checkins(user_id, is_automatic, created_at DESC);
```

**Important Note**: The default value is `TRUE` (automatic). Manual check-ins explicitly set this to `FALSE`. This design assumes check-ins are automatic by default unless specifically created by user action.

### Migration
Run the migration file `migrations/add_is_automatic_to_checkins.sql` to add the new column and indexes.

## Configuration

### Adding New Timezones
To support additional timezones, update the `TIMEZONE_OFFSETS` object in `autoCheckinJobs.ts`:

```typescript
const TIMEZONE_OFFSETS = {
  'CUSTOM_TZ': offset_in_hours,
  // ... existing timezones
};
```

Then add corresponding cron jobs in `scheduleAutomaticCheckInCron()`.

### Customizing Automatic Check-in Values
Modify the `createAutomaticCheckIn` function to change default values:
- Mood level (0-1)
- Status ('victory' vs 'relapse')
- Note content
- Other attributes

## Monitoring & Debugging

### Logs
The system provides comprehensive logging:
- User processing counts by timezone
- Success/failure rates
- Achievement unlock notifications
- Error details with stack traces

### Admin Endpoint
Use the admin trigger endpoint for testing:
```bash
curl -X POST /accountability/admin/trigger-auto-checkins \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Analytics Queries
Query automatic vs manual check-ins:
```sql
-- Count automatic vs manual check-ins
SELECT 
  is_automatic,
  COUNT(*) as count,
  DATE(created_at) as date
FROM accountability_checkins 
WHERE created_at >= CURRENT_DATE - INTERVAL 7 DAY
GROUP BY is_automatic, DATE(created_at)
ORDER BY date DESC, is_automatic;

-- Users with only automatic check-ins (may need intervention)
SELECT u.id, u.username, COUNT(ac.id) as auto_checkins
FROM users u
JOIN accountability_checkins ac ON u.id = ac.user_id
WHERE ac.is_automatic = true 
  AND ac.created_at >= CURRENT_DATE - INTERVAL 7 DAY
  AND u.id NOT IN (
    SELECT DISTINCT user_id 
    FROM accountability_checkins 
    WHERE is_automatic = false 
      AND created_at >= CURRENT_DATE - INTERVAL 7 DAY
  )
GROUP BY u.id, u.username
HAVING auto_checkins > 3
ORDER BY auto_checkins DESC;
```

## Future Enhancements

### Potential Improvements
1. **Smart Status Detection**: Use ML to predict likely status based on user patterns
2. **Timezone Auto-Detection**: Automatically detect timezone from user's device/location
3. **Configurable Timing**: Allow users to set their own "end of day" time
4. **Reminder System**: Send push notifications before automatic check-in triggers
5. **Analytics Dashboard**: Admin interface showing automatic check-in patterns
6. **User Preferences**: Allow users to opt-out of automatic check-ins
7. **Graduated Responses**: Different default moods based on recent manual check-in patterns

### Technical Improvements
1. **Queue-Based Processing**: Move to Redis/BullMQ for better scalability
2. **Distributed Cron**: Support for multiple server instances
3. **Timezone Library**: Integrate proper timezone handling library (moment-timezone)
4. **Error Recovery**: Retry failed automatic check-ins
5. **Rate Limiting**: Protect against API abuse on admin endpoints