# Action Commitments System - Quick Start

## 🚀 Setup Instructions

### 1. Run Database Migration
```bash
# Connect to your MySQL database and run the migration
mysql -u your_username -p your_database < migrations/create_action_commitments_tables.sql
```

### 2. Seed Default Actions
```bash
npm run seed:actions
```

### 3. Start the Server
```bash
npm run dev
```

## ✅ What's Been Implemented

### Database & Models
- ✅ 5 new tables: `actions`, `commitments`, `action_proofs`, `user_service_stats`, `redemption_wall`
- ✅ Sequelize models with proper associations
- ✅ TypeScript interfaces and enums
- ✅ Database indexes for performance

### Business Logic
- ✅ Complete service layer (`commitmentService.ts`)
- ✅ Create commitments (ACTION, FINANCIAL, HYBRID types)
- ✅ Report relapses
- ✅ Submit proof with media upload structure
- ✅ Partner verification (approve/reject)
- ✅ User service statistics
- ✅ Public redemption wall feed
- ✅ Auto-approval logic
- ✅ Overdue checking

### API Endpoints
- ✅ 11 RESTful endpoints fully implemented
- ✅ Authentication middleware integrated
- ✅ Error handling and validation
- ✅ Query parameters and filtering

### Automation
- ✅ Cron jobs for overdue checking (hourly)
- ✅ Cron jobs for auto-approval (daily)
- ✅ Integrated with server startup

### Data
- ✅ 17 pre-defined actions across 7 categories
- ✅ Seeding script for default actions

## 📋 API Endpoints

### Actions
```
GET  /api/actions                    - List all available actions
GET  /api/actions/:id                - Get specific action details
```

### Commitments
```
POST /api/commitments                - Create new commitment
GET  /api/commitments                - Get user's commitments
GET  /api/commitments/:id            - Get specific commitment
POST /api/commitments/:id/report-relapse        - Report a relapse
POST /api/commitments/:id/submit-proof          - Upload proof (multipart)
POST /api/commitments/:id/verify-proof          - Partner verifies proof
GET  /api/commitments/:id/check-deadline        - Check deadline status
```

### Statistics & Community
```
GET  /api/users/:userId/service-stats           - Get user statistics
GET  /api/redemption-wall                       - Public redemption feed
GET  /api/partner/verification-requests         - Pending verifications
```

## 🔧 TODO: Integration Required

### 1. File Upload ✅ COMPLETED
**S3 integration is now live!** The system uses the existing `uploadScreenshotImage` service.

**Implementation:**
```typescript
// Already implemented in routes/commitments.ts
import { uploadScreenshotImage } from '../services/screenshotStorageService';

const buffer = Buffer.from(mediaBase64, 'base64');
const uploadResult = await uploadScreenshotImage({
  userId,
  buffer,
  mimeType: mimeType || 'image/jpeg',
  prefix: 'action-proofs',
});
```

**API Format:** Send base64-encoded media in JSON body:
```json
{
  "mediaBase64": "<base64-string>",
  "mimeType": "image/jpeg",
  "mediaType": "PHOTO"
}
```

**Remaining TODO:**
- ⚠️ Add thumbnail generation for videos (currently uses same URL)
- ⚠️ Add client-side file size validation

### 2. Push Notifications ✅ COMPLETED
**All notifications are now integrated with the existing PushQueue system!**

**Implemented notifications:**
```typescript
✅ Partner selected for commitment
✅ Relapse reported (to user and partner)
✅ Proof submitted for verification
✅ Proof approved by partner
✅ Proof rejected by partner
✅ Deadline missed
✅ Auto-approval after 24h timeout
- Relapse reported
- Proof submitted
- Proof approved/rejected
- Deadline reminders
- Deadline missed
```

### 3. Additional Enhancements
- [ ] Add thumbnail generation for videos
- [ ] Reverse geocoding for location addresses
- [ ] Badge/achievement integration for service milestones
- [ ] Payment processing for HYBRID/FINANCIAL commitments
- [ ] Unit and integration tests
- [ ] API documentation (Swagger/OpenAPI)

## 📊 Database Schema

### Tables Created
1. **actions** - Pre-defined good deeds (17 seeded)
2. **commitments** - User commitments with status tracking
3. **action_proofs** - Photo/video evidence
4. **user_service_stats** - Aggregate user statistics
5. **redemption_wall** - Public redemption feed

### Key Relationships
```
users (existing)
  ├─→ commitments (user_id, partner_id)
  │     ├─→ actions (action_id)
  │     └─→ action_proofs (commitment_id)
  │           └─→ redemption_wall (proof_id)
  └─→ user_service_stats (user_id)
```

## 🎯 Feature Highlights

### Commitment Types
- **ACTION**: Complete a good deed if you relapse
- **FINANCIAL**: Donate money if you relapse (structure ready)
- **HYBRID**: Both action AND financial consequence

### Proof Verification
- Partner verification (approve/reject with reasons)
- Auto-approval after 24h if no partner response
- Late submission handling with partial credit
- Resubmission allowed after rejection

### Service Tracking
- Total service hours
- Actions completed
- Redemption streaks
- Money donated (for hybrid)
- Breakdown by category and month

### Public Sharing
- Anonymous redemption wall
- Optional public sharing of completed actions
- Community encouragement system

## 🔍 Testing

Test the endpoints using your API client:

### Example: Create Commitment
```bash
curl -X POST http://localhost:3000/api/commitments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commitmentType": "ACTION",
    "actionId": 1,
    "targetDate": "2025-12-31T00:00:00Z",
    "partnerId": 123,
    "requirePartnerVerification": true,
    "allowPublicShare": true
  }'
```

### Example: Report Relapse
```bash
curl -X POST http://localhost:3000/api/commitments/1/report-relapse \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "relapseDate": "2025-10-04T14:30:00Z",
    "notes": "Had a difficult day"
  }'
```

## 📖 Documentation

For complete documentation, see:
- **COMMITMENT_SYSTEM_GUIDE.md** - Comprehensive guide with all details
- **migrations/create_action_commitments_tables.sql** - Database schema

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if tables were created
mysql -u your_username -p -e "SHOW TABLES LIKE '%action%';" your_database
```

### Actions Not Seeded
```bash
# Re-run seeding
npm run seed:actions
```

### TypeScript Errors
```bash
# Check for compilation errors
npm run typecheck
```

### Server Won't Start
```bash
# Check logs for errors
npm run dev

# Common issues:
# - Database connection failed
# - Redis not running
# - Port already in use
```

## 🎉 Success!

If everything is set up correctly:
1. Server starts without errors
2. Actions are seeded (17 actions)
3. API endpoints respond correctly
4. Cron jobs are scheduled

**Next:** Integrate file upload and notifications to make it fully functional!

## 📞 Support

For questions or issues:
1. Check COMMITMENT_SYSTEM_GUIDE.md
2. Review error logs
3. Verify database migration ran successfully
4. Ensure all dependencies are installed

---

**Built with:** TypeScript, Fastify, Sequelize, MySQL, Node-Cron
