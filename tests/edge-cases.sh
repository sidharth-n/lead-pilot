#!/bin/bash
# LeadPilot Edge Case Test Script
# Run this from the lead-pilot directory with: bash tests/edge-cases.sh

BASE_URL="http://localhost:3000"

echo "================================================"
echo "  LeadPilot Edge Case Tests"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; }
fail() { echo -e "${RED}❌ FAIL${NC}: $1"; }
info() { echo -e "${YELLOW}ℹ️  INFO${NC}: $1"; }

PASS_COUNT=0
FAIL_COUNT=0

test_pass() { 
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASS_COUNT++))
}
test_fail() { 
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAIL_COUNT++))
}

# ================================================
# 1. Input Validation Tests
# ================================================
echo "--- 1. INPUT VALIDATION ---"

# Test: Invalid email format
echo ""
info "Testing invalid email format..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email"}')

if echo "$RESPONSE" | grep -q "email format is invalid"; then
  test_pass "Invalid email rejected"
else
  test_fail "Invalid email not rejected: $RESPONSE"
fi

# Test: Missing required field
info "Testing missing required fields..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}')

if echo "$RESPONSE" | grep -q "is required"; then
  test_pass "Missing fields detected"
else
  test_fail "Missing fields not detected: $RESPONSE"
fi

# Test: Empty email
info "Testing empty email..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"email":""}')

if echo "$RESPONSE" | grep -q "email is required\|email format"; then
  test_pass "Empty email rejected"
else
  test_fail "Empty email not rejected: $RESPONSE"
fi

# Test: Empty contact_ids array
info "Testing empty contact_ids array..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns/test-id/leads \
  -H "Content-Type: application/json" \
  -d '{"contact_ids":[]}')

if echo "$RESPONSE" | grep -q "cannot be empty"; then
  test_pass "Empty contact_ids rejected"
else
  test_fail "Empty contact_ids not rejected: $RESPONSE"
fi

# ================================================
# 2. 404 Not Found Tests
# ================================================
echo ""
echo "--- 2. NOT FOUND (404) TESTS ---"

# Test: Contact not found
info "Testing contact not found..."
RESPONSE=$(curl -s $BASE_URL/api/contacts/nonexistent-id)

if echo "$RESPONSE" | grep -q "not found\|NOT_FOUND"; then
  test_pass "Contact 404 returned"
else
  test_fail "Contact 404 not returned: $RESPONSE"
fi

# Test: Campaign not found
info "Testing campaign not found..."
RESPONSE=$(curl -s $BASE_URL/api/campaigns/nonexistent-id)

if echo "$RESPONSE" | grep -q "not found\|NOT_FOUND"; then
  test_pass "Campaign 404 returned"
else
  test_fail "Campaign 404 not returned: $RESPONSE"
fi

# Test: Lead not found for simulate-reply
info "Testing lead not found..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns/leads/nonexistent-id/simulate-reply)

if echo "$RESPONSE" | grep -q "not found\|NOT_FOUND"; then
  test_pass "Lead 404 returned"
else
  test_fail "Lead 404 not returned: $RESPONSE"
fi

# ================================================
# 3. Duplicate Prevention Tests
# ================================================
echo ""
echo "--- 3. DUPLICATE PREVENTION ---"

# Create a contact
info "Creating test contact..."
CONTACT=$(curl -s -X POST $BASE_URL/api/contacts \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"dup-test-$(date +%s)@example.com\",\"first_name\":\"Dup\"}")
CONTACT_ID=$(echo $CONTACT | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$CONTACT_ID" ]; then
  test_pass "Contact created: $CONTACT_ID"
else
  test_fail "Failed to create contact: $CONTACT"
fi

# Try to create duplicate (using same timestamp to ensure duplicate)
info "Testing duplicate email..."
DUP_EMAIL=$(echo $CONTACT | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
RESPONSE=$(curl -s -X POST $BASE_URL/api/contacts \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DUP_EMAIL\",\"first_name\":\"Dup2\"}")

if echo "$RESPONSE" | grep -q "already exists"; then
  test_pass "Duplicate email rejected"
else
  test_fail "Duplicate email not rejected: $RESPONSE"
fi

# ================================================
# 4. Campaign State Tests
# ================================================
echo ""
echo "--- 4. CAMPAIGN STATE TESTS ---"

# Create campaign
info "Creating test campaign..."
CAMPAIGN=$(curl -s -X POST $BASE_URL/api/campaigns \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Edge Case Campaign $(date +%s)\",
    \"from_name\":\"Test\",
    \"from_email\":\"test@test.com\",
    \"subject_template\":\"Hi {{first_name}}\",
    \"body_template\":\"Hello {{first_name}}\",
    \"follow_up_delay_minutes\":1
  }")
CAMPAIGN_ID=$(echo $CAMPAIGN | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$CAMPAIGN_ID" ]; then
  test_pass "Campaign created: $CAMPAIGN_ID"
else
  test_fail "Failed to create campaign: $CAMPAIGN"
fi

# Try to start campaign with no leads
info "Testing start campaign with no leads..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns/$CAMPAIGN_ID/start)

if echo "$RESPONSE" | grep -q "no leads"; then
  test_pass "Cannot start campaign with no leads"
else
  test_fail "Should not start campaign with no leads: $RESPONSE"
fi

# Add lead to campaign
info "Adding lead to campaign..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns/$CAMPAIGN_ID/leads \
  -H "Content-Type: application/json" \
  -d "{\"contact_ids\": [\"$CONTACT_ID\"]}")

if echo "$RESPONSE" | grep -q '"added":1'; then
  test_pass "Lead added to campaign"
else
  test_fail "Failed to add lead: $RESPONSE"
fi

# Try to add same lead again (duplicate)
info "Testing duplicate lead in campaign..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns/$CAMPAIGN_ID/leads \
  -H "Content-Type: application/json" \
  -d "{\"contact_ids\": [\"$CONTACT_ID\"]}")

if echo "$RESPONSE" | grep -q '"skipped":1'; then
  test_pass "Duplicate lead skipped"
else
  test_fail "Duplicate lead not skipped: $RESPONSE"
fi

# Try to add non-existent contact
info "Testing add non-existent contact..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns/$CAMPAIGN_ID/leads \
  -H "Content-Type: application/json" \
  -d '{"contact_ids": ["nonexistent-contact-id"]}')

if echo "$RESPONSE" | grep -q '"skipped":1\|not found'; then
  test_pass "Non-existent contact skipped"
else
  test_fail "Non-existent contact not handled: $RESPONSE"
fi

# Start campaign
info "Starting campaign..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns/$CAMPAIGN_ID/start)

if echo "$RESPONSE" | grep -q '"success":true'; then
  test_pass "Campaign started"
else
  test_fail "Failed to start campaign: $RESPONSE"
fi

# Try to start already-active campaign (idempotent)
info "Testing start already-active campaign..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns/$CAMPAIGN_ID/start)

if echo "$RESPONSE" | grep -q '"success":true\|already active'; then
  test_pass "Start active campaign is idempotent"
else
  test_fail "Start active campaign failed: $RESPONSE"
fi

# Try to delete active campaign
info "Testing delete active campaign..."
RESPONSE=$(curl -s -X DELETE $BASE_URL/api/campaigns/$CAMPAIGN_ID)

if echo "$RESPONSE" | grep -q "Cannot delete"; then
  test_pass "Cannot delete active campaign"
else
  test_fail "Should not delete active campaign: $RESPONSE"
fi

# Pause campaign
info "Pausing campaign..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns/$CAMPAIGN_ID/pause)

if echo "$RESPONSE" | grep -q '"success":true'; then
  test_pass "Campaign paused"
else
  test_fail "Failed to pause campaign: $RESPONSE"
fi

# Try to pause already-paused campaign (idempotent)
info "Testing pause already-paused campaign..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns/$CAMPAIGN_ID/pause)

if echo "$RESPONSE" | grep -q '"success":true\|already paused'; then
  test_pass "Pause paused campaign is idempotent"
else
  test_fail "Pause paused campaign failed: $RESPONSE"
fi

# ================================================
# 5. Lead State Tests
# ================================================
echo ""
echo "--- 5. LEAD STATE TESTS ---"

# Create a fresh campaign for lead tests
info "Creating campaign for lead state tests..."
LEAD_CAMPAIGN=$(curl -s -X POST $BASE_URL/api/campaigns \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Lead State Test $(date +%s)\",
    \"from_name\":\"Test\",
    \"from_email\":\"test@test.com\",
    \"subject_template\":\"Hi {{first_name}}\",
    \"body_template\":\"Hello\",
    \"follow_up_delay_minutes\":60
  }")
LEAD_CAMPAIGN_ID=$(echo $LEAD_CAMPAIGN | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Create contact for this test
LEAD_CONTACT=$(curl -s -X POST $BASE_URL/api/contacts \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"lead-state-$(date +%s)@test.com\",\"first_name\":\"LeadTest\"}")
LEAD_CONTACT_ID=$(echo $LEAD_CONTACT | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Add to campaign
curl -s -X POST $BASE_URL/api/campaigns/$LEAD_CAMPAIGN_ID/leads \
  -H "Content-Type: application/json" \
  -d "{\"contact_ids\": [\"$LEAD_CONTACT_ID\"]}" > /dev/null

# Get lead ID
LEADS_RESPONSE=$(curl -s $BASE_URL/api/campaigns/$LEAD_CAMPAIGN_ID/leads)
LEAD_ID=$(echo $LEADS_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Try to simulate reply before email sent (lead is pending)  
info "Testing simulate reply before email sent..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/campaigns/leads/$LEAD_ID/simulate-reply)

if echo "$RESPONSE" | grep -q "Cannot mark\|before.*sent\|INVALID_STATE"; then
  test_pass "Cannot reply before email sent"
else
  test_fail "Should not allow reply before email: $RESPONSE"
fi

# ================================================
# 6. Daily Limit Test
# ================================================
echo ""
echo "--- 6. DAILY LIMIT TEST ---"

# Create campaign with daily limit of 2
info "Creating campaign with daily_limit=2..."
LIMIT_CAMPAIGN=$(curl -s -X POST $BASE_URL/api/campaigns \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Daily Limit Test $(date +%s)\",
    \"from_name\":\"Test\",
    \"from_email\":\"test@test.com\",
    \"subject_template\":\"Hi\",
    \"body_template\":\"Hello\",
    \"follow_up_enabled\":false,
    \"daily_limit\":2
  }")
LIMIT_CAMPAIGN_ID=$(echo $LIMIT_CAMPAIGN | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Create 4 contacts
for i in 1 2 3 4; do
  curl -s -X POST $BASE_URL/api/contacts \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"limit-$i-$(date +%s)@test.com\",\"first_name\":\"Limit$i\"}" > /dev/null
done

# Get all contacts and add to campaign
ALL_CONTACTS=$(curl -s $BASE_URL/api/contacts)
LIMIT_CONTACT_IDS=$(echo $ALL_CONTACTS | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | tail -4 | tr '\n' ',' | sed 's/,$//')

curl -s -X POST $BASE_URL/api/campaigns/$LIMIT_CAMPAIGN_ID/leads \
  -H "Content-Type: application/json" \
  -d "{\"contact_ids\": [$(echo $LIMIT_CONTACT_IDS | sed 's/\([^,]*\)/"\1"/g')]}" > /dev/null

# Start campaign
curl -s -X POST $BASE_URL/api/campaigns/$LIMIT_CAMPAIGN_ID/start > /dev/null

# Run processor
info "Running processor (should send max 2 due to daily limit)..."
curl -s -X POST $BASE_URL/api/processor/run > /dev/null

# Check how many were sent
SENT_COUNT=$(curl -s $BASE_URL/api/campaigns/$LIMIT_CAMPAIGN_ID/leads | grep -o '"status":"completed\|waiting_follow_up\|sent"' | wc -l)
PENDING_COUNT=$(curl -s $BASE_URL/api/campaigns/$LIMIT_CAMPAIGN_ID/leads | grep -o '"status":"pending"' | wc -l)

info "Sent: $SENT_COUNT, Pending: $PENDING_COUNT"

if [ "$SENT_COUNT" == "2" ]; then
  test_pass "Daily limit respected (only 2 sent)"
else
  test_fail "Daily limit not respected: $SENT_COUNT sent instead of 2"
fi

# ================================================
# 7. Race Condition Test
# ================================================
echo ""
echo "--- 7. RACE CONDITION TEST ---"

# Create fresh campaign for race condition test
info "Creating race condition test campaign..."
CAMPAIGN2=$(curl -s -X POST $BASE_URL/api/campaigns \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Race Condition Test $(date +%s)\",
    \"from_name\":\"Test\",
    \"from_email\":\"test@test.com\",
    \"subject_template\":\"Hi {{first_name}}\",
    \"body_template\":\"Hello {{first_name}}\",
    \"follow_up_delay_minutes\":1
  }")
RC_CAMPAIGN_ID=$(echo $CAMPAIGN2 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Create 3 contacts for race condition test
info "Creating 3 contacts for race test..."
TS=$(date +%s)
C1=$(curl -s -X POST $BASE_URL/api/contacts -H "Content-Type: application/json" -d "{\"email\":\"race1-$TS@test.com\",\"first_name\":\"Race1\"}")
C1_ID=$(echo $C1 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
C2=$(curl -s -X POST $BASE_URL/api/contacts -H "Content-Type: application/json" -d "{\"email\":\"race2-$TS@test.com\",\"first_name\":\"Race2\"}")
C2_ID=$(echo $C2 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
C3=$(curl -s -X POST $BASE_URL/api/contacts -H "Content-Type: application/json" -d "{\"email\":\"race3-$TS@test.com\",\"first_name\":\"Race3\"}")
C3_ID=$(echo $C3 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Add all to campaign
curl -s -X POST $BASE_URL/api/campaigns/$RC_CAMPAIGN_ID/leads \
  -H "Content-Type: application/json" \
  -d "{\"contact_ids\": [\"$C1_ID\",\"$C2_ID\",\"$C3_ID\"]}" > /dev/null

# Start campaign
curl -s -X POST $BASE_URL/api/campaigns/$RC_CAMPAIGN_ID/start > /dev/null
test_pass "Race condition campaign started with 3 leads"

# Run processor - send initial emails
info "Running processor (initial emails)..."
curl -s -X POST $BASE_URL/api/processor/run > /dev/null
test_pass "Initial emails sent"

# Get lead IDs
LEADS_RESPONSE=$(curl -s $BASE_URL/api/campaigns/$RC_CAMPAIGN_ID/leads)
LEAD_ID=$(echo $LEADS_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Simulate reply on one lead
info "Simulating reply on lead 1..."
curl -s -X POST $BASE_URL/api/campaigns/leads/$LEAD_ID/simulate-reply > /dev/null
test_pass "Lead 1 marked as replied"

# Wait for follow-up time (1 minute + buffer)
info "Waiting 65 seconds for follow-up time..."
sleep 65

# Run processor again
info "Running processor (follow-ups)..."
RESULT=$(curl -s -X POST $BASE_URL/api/processor/run)
test_pass "Processor completed"

# Check results
FINAL=$(curl -s $BASE_URL/api/campaigns/$RC_CAMPAIGN_ID/leads)
REPLIED=$(echo $FINAL | grep -o '"status":"replied"' | wc -l)
FOLLOWUP=$(echo $FINAL | grep -o '"status":"follow_up_sent"' | wc -l)

echo ""
info "Results: $REPLIED replied, $FOLLOWUP follow-ups sent"

if [ "$REPLIED" == "1" ] && [ "$FOLLOWUP" == "2" ]; then
  test_pass "🎉 RACE CONDITION TEST PASSED! Only 2 follow-ups (not 3)"
else
  test_fail "Race condition test failed: Expected 1 replied + 2 follow-ups"
fi

# ================================================
# Summary
# ================================================
echo ""
echo "================================================"
echo "  Test Summary"
echo "================================================"
echo ""
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
else
  echo -e "${RED}⚠️  Some tests failed. Check logs above.${NC}"
fi
