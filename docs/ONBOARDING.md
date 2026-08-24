# Merchant Onboarding Flow

## Overview

The onboarding wizard appears immediately after a merchant installs the app. It guides them through 3 steps to get their first countdown timer live, and verifies success at each step.

## Steps

### Step 1: Configure Your Campaign

**Goal:** Merchant sets up their first sale event with a real end date.

**UI:** Link to `/app/campaigns/new` (campaign creation). Steps 1 and 2 are completed together.

**Completion trigger:** When merchant saves their first valid campaign with a future end date, `OnboardingState.step1Complete` and `step2Complete` are set to `true`.

**What to show:**

- Pre-filled example: "Black Friday Sale Ends In..." with end date 7 days from today
- Clear help text on every field
- Form validation with real-time error messages

### Step 2: Choose Your Design

**Goal:** Merchant customizes colors and position.

**UI:** Part of the campaign creation form (same form as Step 1). Completed simultaneously with Step 1.

**Completion trigger:** Same as Step 1.

### Step 3: Install in Your Theme

**Goal:** Merchant adds the countdown bar App Block to their theme.

**UI:** Dedicated card in onboarding wizard with:

- "Open Theme Editor" button → deep links to `https://{shop}/admin/themes/current/editor`
- Instructions: "In the Theme Editor, click 'Add section' → 'Apps' → 'Countdown & CTA Bar'"
- "Mark as Installed" button → submits form, sets `step3Complete=true`

**Completion trigger:** Merchant clicks "Mark as Installed".

## Success State

When all 3 steps are complete:

- Show success Banner: "Your countdown timer is live!"
- Show "Go to Dashboard" CTA (→ `/app`)
- `OnboardingState.completedAt` stamped with current timestamp

## Re-entry

If merchant leaves the wizard incomplete, they see the wizard again on next visit until `step3Complete` is true.

## Post-Onboarding

After onboarding is complete, the wizard route redirects to `/app` (the dashboard) so merchants land on their campaign overview.

## Psychology Notes

- Steps are designed for progressive disclosure — merchants never feel overwhelmed
- Pre-filled defaults mean they can click "Save" immediately and have a working timer
- The extension installation step includes a deep link so the friction of finding the App Block in the Theme Editor is eliminated
- Completion animations and success state create a positive first impression
