# Action Commitments System - Implementation Guide

## Overview
The Action Commitments System is a comprehensive accountability feature that allows users to commit to completing good deeds (actions) if they relapse. This system includes photo/video proof verification, partner accountability, service hour tracking, and a public redemption wall.

## Database Schema

### Tables Created
1. **actions** - Pre-defined good deeds users can commit to
2. **commitments** - User commitments with target dates and status tracking
3. **action_proofs** - Photo/video evidence submitted by users
4. **user_service_stats** - Aggregate statistics for each user
5. **redemption_wall** - Public feed of completed redemptions

## Setup Instructions

### 1. Run Database Migration
```bash
# Execute the SQL migration
mysql -u your_user -p your_database < migrations/create_action_commitments_tables.sql
```

### 2. Seed Default Actions
```bash
# Run the seeding script
npm run seed:actions
```

Or add to package.json:
```json
{
  "scripts": {
    "seed:actions": "ts-node scripts/seedActions.ts"
  }
}
```

### 3. Register Routes in server.ts
```typescript
import commitmentRoutes from './routes/commitments';

// Register in your server setup
await fastify.register(commitmentRoutes, { prefix: '/api' });
```

### 4. Setup Cron Jobs
Add to your cron job scheduler:
```typescript
import commitmentService from './services/commitmentService';

// Check for overdue commitments hourly
cron.schedule('0 * * * *', async () => {
  await commitmentService.checkOverdueCommitments();
});

// Auto-approve pending proofs daily
cron.schedule('0 2 * * *', async () => {
  await commitmentService.autoApproveProofs();
});
```

## API Endpoints

### Actions
- `GET /api/actions` - List all available actions
- `GET /api/actions/:id` - Get specific action details

### Commitments
- `POST /api/commitments` - Create new commitment
- `GET /api/commitments` - Get user's commitments
- `GET /api/commitments/:id` - Get specific commitment
- `POST /api/commitments/:id/report-relapse` - Report a relapse
- `POST /api/commitments/:id/submit-proof` - Upload proof (multipart)
- `POST /api/commitments/:id/verify-proof` - Partner verifies proof
- `GET /api/commitments/:id/check-deadline` - Check deadline status

### Statistics & Community
- `GET /api/users/:userId/service-stats` - Get user service statistics
- `GET /api/redemption-wall` - Get public redemption feed
- `GET /api/partner/verification-requests` - Get pending verifications

## API Request/Response Examples

### Create Commitment
```typescript
POST /api/commitments
{
  "commitmentType": "ACTION",
  "actionId": 1,
  "targetDate": "2025-12-31T00:00:00Z",
  "partnerId": 123,
  "requirePartnerVerification": true,
  "allowPublicShare": true
}

Response:
{
  "success": true,
  "commitmentId": 456,
  "message": "Action commitment created successfully",
  "data": {
    "commitmentType": "ACTION",
    "actionTitle": "Serve at soup kitchen",
    "targetDate": "2025-12-31T00:00:00.000Z",
    "status": "ACTIVE",
    "actionDetails": {
      "estimatedHours": 3,
      "proofInstructions": "Take photo of yourself serving food...",
      "deadline": "48 hours after relapse"
    }
  }
}
```

### Report Relapse
```typescript
POST /api/commitments/456/report-relapse
{
  "relapseDate": "2025-10-15T14:30:00Z",
  "notes": "Had a difficult day"
}

Response:
{
  "success": true,
  "message": "Relapse reported. You have 48 hours to complete your action.",
  "data": {
    "commitmentId": 456,
    "status": "ACTION_PENDING",
    "actionRequired": {
      "title": "Serve at soup kitchen",
      "description": "Help serve meals...",
      "estimatedHours": 3,
      "proofInstructions": "Take photo...",
      "deadline": "2025-10-17T14:30:00.000Z"
    }
  }
}
```

### Submit Proof (Base64 Encoded Media)
```bash
POST /api/commitments/:id/submit-proof
Content-Type: application/json
Authorization: Bearer <token>

{
  "mediaBase64": "<base64-encoded-image-or-video>",
  "mimeType": "image/jpeg",  // or "video/mp4", etc.
  "mediaType": "PHOTO",      // or "VIDEO"
  "userNotes": "Optional notes about the action",
  "capturedAt": "2025-10-04T10:30:00Z",
  "latitude": 40.7128,        // Optional GPS
  "longitude": -74.0060       // Optional GPS
}
```

### Verify Proof (Partner)
```typescript
POST /api/commitments/456/verify-proof
{
  "proofId": 789,
  "approved": true,
  "encouragementMessage": "Proud of you!"
}

Response:
{
  "success": true,
  "message": "Proof approved. Action marked as complete.",
  "data": {
    "commitmentId": 456,
    "proofId": 789,
    "status": "ACTION_COMPLETED",
    "verifiedAt": "2025-10-16T19:00:00.000Z",
    "verifiedBy": 123,
    "userStats": {
      "totalServiceHours": 12.5,
      "totalActionsCompleted": 4,
      "redemptionStreak": 3
    }
  }
}
```

## File Upload Configuration

### TODO: S3/Cloud Storage Integration
The current implementation uses placeholder URLs for media files. You need to integrate with your cloud storage solution (AWS S3, Google Cloud Storage, etc.).

Update in `routes/commitments.ts`:
```typescript
## File Upload Configuration

### ✅ S3/Cloud Storage Integration (IMPLEMENTED)
The system now uses the existing S3 implementation via `screenshotStorageService`.

**Location:** `src/routes/commitments.ts` (submit-proof endpoint)

**Implementation:**
```typescript
import { uploadScreenshotImage } from '../services/screenshotStorageService';

// Upload to S3
const buffer = Buffer.from(mediaBase64, 'base64');
const uploadResult = await uploadScreenshotImage({
  userId,
  buffer,
  mimeType: mimeType || 'image/jpeg',
  prefix: 'action-proofs', // Stored in action-proofs folder
});

const mediaFile = {
  url: uploadResult.publicUrl || `storage://${uploadResult.storageKey}`,
  thumbnailUrl: uploadResult.publicUrl || `storage://${uploadResult.storageKey}`,
  storageKey: uploadResult.storageKey,
};
```

**Storage Configuration:**
- Files are stored in the `action-proofs/{userId}/` folder structure
- Uses the same S3 bucket and credentials as screenshot storage
- Supports both public URLs and presigned URLs
- Configuration is in `src/config/environment.ts` (screenshotStorageConfig)
```

## Notification Integration

### TODO: Setup Push Notifications
Integrate with your existing notification system to send alerts for:
- Partner selected for commitment
- Relapse reported (to partner)
- Proof submitted (to partner for verification)
- Proof approved/rejected (to user)
- Deadline reminders (24h, 12h, 2h, 1h before)
- Deadline missed
- Auto-approval completed

Example integration points in `commitmentService.ts`:
```typescript
// After creating commitment
await notificationService.send(data.partnerId, {
  title: "You've been chosen as accountability partner",
  body: `${user.firstName} selected you to help with their commitment`,
  type: 'COMMITMENT_PARTNER_SELECTED',
  data: { commitmentId: commitment.id }
});
```

## Features

### ✅ Completed
- Database schema and models
- Core service layer with business logic
- API endpoints (structure)
- Action seeding script
- Service statistics tracking
- Redemption wall functionality
- Partner verification system
- Deadline checking
- Late submission handling

### 🔄 TODO (Integration Required)
1. ✅ **File Upload**: S3 integration completed via uploadScreenshotImage
   - ⚠️ TODO: Add thumbnail generation for videos
2. ✅ **Notifications**: Push notifications integrated with PushQueue
   - Partner selection notifications
   - Relapse reported notifications (user & partner)
   - Proof submission notifications
   - Proof approval/rejection notifications
   - Deadline missed notifications
   - Auto-approval notifications
3. ✅ **Route Completion**: TypeScript errors fixed
4. **Reminders**: Setup cron jobs for deadline reminders (basic implementation done)
5. **Geolocation**: Add reverse geocoding for addresses
6. **Image Processing**: Add thumbnail generation for videos
7. **Badges/Achievements**: Award badges for service milestones
8. **Financial Integration**: Payment processing for HYBRID commitments
9. **Testing**: Add unit and integration tests
10. **Documentation**: API documentation (Swagger/OpenAPI)

## Status Workflow

```
ACTIVE (User creates commitment)
   ↓
[User reports relapse]
   ↓
ACTION_PENDING (User has 48 hours to complete action)
   ↓
[User submits proof]
   ↓
ACTION_PROOF_SUBMITTED (Waiting for partner verification)
   ↓
[Partner approves] → ACTION_COMPLETED ✅
[Partner rejects] → ACTION_PENDING (resubmit)
[Deadline passes] → ACTION_OVERDUE ⚠️
```

## Commitment Types

1. **ACTION**: Complete a good deed if you relapse
2. **FINANCIAL**: Donate money if you relapse (future)
3. **HYBRID**: Both action AND financial consequence

## Edge Cases Handled

- Partner doesn't respond within 48h → Auto-approve
- User misses deadline → Mark as overdue, break streak
- Multiple proof submissions → Mark previous as superseded
- Custom actions → Require partner verification
- Late completions → Partial credit, marked as late
- GPS requirements → Optional but logged for verification

## Security Considerations

- All endpoints require authentication
- Users can only access their own commitments (except partners)
- Partner authorization checked for verification requests
- File upload validation needed (size, type, malicious content)
- Rate limiting recommended for proof submissions
- Image moderation recommended for public redemption wall

## Performance Optimizations

- Database indexes on frequently queried columns
- Pagination on redemption wall and lists
- Caching for action lists (rarely change)
- Lazy loading of related data
- Background jobs for notifications and reminders

## Next Steps

1. Fix TypeScript errors in `routes/commitments.ts`
2. Integrate file upload service
3. Wire up notification system
4. Add cron jobs for automated tasks
5. Test end-to-end flows
6. Deploy and monitor

## Support

For questions or issues with the Action Commitments System, please create an issue in the repository.
