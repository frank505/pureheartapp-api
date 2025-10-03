# Screenshot Cleanup Documentation

## Overview
The Screenshot Cleanup Job is an automated cron service that maintains the database and filesystem by removing old screenshot records and their associated data.

## Purpose
- **Data Retention Compliance**: Automatically removes screenshot data older than 30 days
- **Database Performance**: Keeps the database clean and performant by removing old records
- **Storage Management**: Deletes screenshot objects from S3 (or compatible storage)
- **Privacy Protection**: Ensures sensitive image data is not retained longer than necessary

## What Gets Cleaned Up

### Database Records
1. **SensitiveImage** - Main screenshot records older than 30 days
2. **SensitiveImageFinding** - Associated AI detection findings
3. **SensitiveImageComment** - Partner comments on screenshots

### Storage Objects
- Screenshot files stored in S3 (or S3-compatible storage)
- Uses the `storageKey` captured in `SensitiveImage.rawMeta`

## Configuration

### Retention Period
```typescript
const RETENTION_DAYS = 30; // Default: 30 days
```
To change the retention period, modify this constant in `/src/jobs/screenshotCleanupJobs.ts`

### Schedule
- **Cron Schedule**: `0 3 * * *` (Daily at 3:00 AM server time)
- **Why 3:00 AM?**: Low-traffic period, minimal impact on users

## Usage

### Automatic Execution
The cleanup job runs automatically once registered in `server.ts`:
```typescript
import { scheduleScreenshotCleanupCron } from './jobs/screenshotCleanupJobs';

// In your startup code
await scheduleScreenshotCleanupCron();
```

### Manual Trigger (for testing or admin use)
```typescript
import { triggerScreenshotCleanup } from './jobs/screenshotCleanupJobs';

// Trigger manually
const result = await triggerScreenshotCleanup();
console.log(result); // { success: boolean, message: string }
```

### Direct Cleanup Function
```typescript
import { cleanupOldScreenshots } from './jobs/screenshotCleanupJobs';

// Run the cleanup directly
await cleanupOldScreenshots();
```

## Logging

The cleanup job provides detailed logging:

```
[Screenshot Cleanup] Starting cleanup job at 2025-10-02T03:00:00.000Z
[Screenshot Cleanup] Deleting records older than 2025-09-02T03:00:00.000Z
[Screenshot Cleanup] Found 45 old screenshots to delete
[Screenshot Cleanup] Deleted 120 image findings
[Screenshot Cleanup] Deleted 35 image comments
[Screenshot Cleanup] Deleted file: /path/to/image.jpg
[Screenshot Cleanup] Attempted to delete 30 physical files
[Screenshot Cleanup] Cleanup completed successfully in 2.34s
[Screenshot Cleanup] Summary: Deleted 45 images, 120 findings, 35 comments
```

## Error Handling

- **Database Errors**: Logged but job continues where possible
- **File System Errors**: Individual file deletion failures are logged but don't stop the job
- **External URLs**: Skipped (cannot delete files from external services)
- **Missing Files**: Silently skipped (file may already be deleted)

## Database Considerations

### Foreign Key Constraints
The cleanup respects database relationships and deletes in the correct order:
1. SensitiveImageFinding (child records)
2. SensitiveImageComment (child records)
3. SensitiveImage (parent records)

### Paranoid Mode
Uses `force: true` to ensure hard deletion, bypassing Sequelize's paranoid mode if enabled.

## Testing

### Test in Development
```bash
# Run a one-time cleanup
npm run ts-node src/jobs/screenshotCleanupJobs.ts
```

### Verify Cleanup
```sql
-- Check for old records
SELECT COUNT(*) FROM sensitive_images 
WHERE created_at < NOW() - INTERVAL '30 days';

-- After cleanup, should return 0
```

## Monitoring

### What to Monitor
- **Execution Time**: Should typically complete in seconds
- **Records Deleted**: Track trends over time
- **Error Rates**: Monitor for persistent failures
- **S3 Storage**: Verify storage usage is trending down as expected

### Setting Up Alerts
Consider setting up alerts for:
- Cleanup job failures
- Unusually long execution times (>5 minutes)
- Zero deletions over multiple runs (may indicate job not running)

## Security Considerations

- **Access Control**: Only runs on the server, no API endpoint exposed by default
- **Data Privacy**: Ensures sensitive screenshots are removed after retention period
- **Audit Trail**: All deletions are logged for compliance

## Troubleshooting

### Job Not Running
1. Check if cron was properly scheduled in server.ts
2. Verify server timezone configuration
3. Check logs for scheduling errors

### Files Not Being Deleted
1. Verify file permissions
2. Check if imageUrl contains valid paths
3. Ensure files are not stored on external CDN (can't delete external files)

### Database Records Remain
1. Check for foreign key constraint issues
2. Verify Sequelize model associations
3. Look for database lock or transaction issues

## Future Enhancements

Potential improvements:
- Configurable retention periods per user or account type
- Backup before deletion option
- Soft delete with archive option
- Statistics dashboard for cleanup operations
- Email notifications for large cleanup operations

## Related Files
- `/src/jobs/screenshotCleanupJobs.ts` - Main cleanup job implementation
- `/src/models/SensitiveImage.ts` - Screenshot model
- `/src/models/SensitiveImageFinding.ts` - Findings model
- `/src/models/SensitiveImageComment.ts` - Comments model
- `/src/server.ts` - Job registration
