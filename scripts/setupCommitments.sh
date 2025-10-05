#!/bin/bash
# Setup Script for Action Commitments System
# Run this after running the database migration

set -e # Exit on error

echo "🚀 Setting up Action Commitments System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if migration has been run
echo -e "${BLUE}Step 1: Checking database setup...${NC}"
echo "Please ensure you have run the migration:"
echo "mysql -u your_user -p your_database < migrations/create_action_commitments_tables.sql"
echo ""
read -p "Have you run the migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${YELLOW}Please run the migration first, then re-run this script.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database migration confirmed${NC}"
echo ""

# Step 2: Seed actions
echo -e "${BLUE}Step 2: Seeding default actions...${NC}"
npm run seed:actions

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Actions seeded successfully${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Action seeding may have failed. Check logs above.${NC}"
fi
echo ""

# Step 3: Verify setup
echo -e "${BLUE}Step 3: Verifying setup...${NC}"
echo "Checking if required files exist..."

FILES=(
    "src/models/Action.ts"
    "src/models/Commitment.ts"
    "src/models/ActionProof.ts"
    "src/models/UserServiceStats.ts"
    "src/models/RedemptionWall.ts"
    "src/services/commitmentService.ts"
    "src/routes/commitments.ts"
    "src/jobs/commitmentJobs.ts"
    "src/types/commitment.ts"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${YELLOW}✗${NC} $file (missing)"
        ALL_EXIST=false
    fi
done
echo ""

if [ "$ALL_EXIST" = true ]; then
    echo -e "${GREEN}✅ All required files are present${NC}"
else
    echo -e "${YELLOW}⚠ Some files are missing. Please check the setup.${NC}"
fi
echo ""

# Step 4: Final checklist
echo -e "${BLUE}Step 4: Setup checklist${NC}"
echo "Please ensure the following:"
echo ""
echo "✓ Database migration has been run"
echo "✓ Default actions have been seeded"
echo "✓ Server.ts has been updated with commitment routes"
echo "✓ Cron jobs are scheduled in server.ts"
echo ""
echo "📝 TODO Items:"
echo "  1. Integrate file upload (S3/Cloud Storage)"
echo "  2. Wire up push notifications"
echo "  3. Test all endpoints"
echo "  4. Configure environment variables if needed"
echo ""

echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "To start the server:"
echo "  npm run dev"
echo ""
echo "API Endpoints available at:"
echo "  POST   /api/commitments"
echo "  GET    /api/commitments"
echo "  GET    /api/commitments/:id"
echo "  POST   /api/commitments/:id/report-relapse"
echo "  POST   /api/commitments/:id/submit-proof"
echo "  POST   /api/commitments/:id/verify-proof"
echo "  GET    /api/commitments/:id/check-deadline"
echo "  GET    /api/actions"
echo "  GET    /api/actions/:id"
echo "  GET    /api/users/:userId/service-stats"
echo "  GET    /api/redemption-wall"
echo "  GET    /api/partner/verification-requests"
echo ""
echo "📖 For detailed documentation, see COMMITMENT_SYSTEM_GUIDE.md"
echo ""
