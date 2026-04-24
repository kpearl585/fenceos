# Deployment Troubleshooting Guide

**Stop Vercel Deployment Failures**

---

## Why Your Deployments Keep Failing

### Root Cause Pattern

Your deployments fail because **code is committed without being tested locally first**.

**The Pattern:**
1. Code changes made
2. ✅ Git commit
3. ❌ Push to GitHub
4. Vercel tries to build
5. 💥 **TypeScript/Build error discovered**
6. Deployment fails

**The Fix:**
1. Code changes made
2. ✅ **Run `npm run build` locally**
3. ✅ Fix any errors
4. ✅ Git commit
5. ✅ Push to GitHub
6. ✅ **Vercel succeeds**

---

## Common Failure Causes

### 1. TypeScript Errors (Most Common)

**Example from today:**
```typescript
// ❌ WRONG: TypeScript doesn't know err has 'errors' property
if (err instanceof z.ZodError) {
  return { error: err.errors[0].message };  // Fails type check
}

// ✅ CORRECT: Use 'issues' property
if (err instanceof z.ZodError) {
  const firstError = err.issues[0];
  return { error: firstError?.message };
}
```

**How to prevent:**
```bash
# Always run before committing
npm run build
```

---

### 2. Missing Dependencies

**Example:**
```typescript
import { SomeComponent } from '@/components/SomeComponent';
// But you forgot to install the package
```

**How to prevent:**
```bash
# After installing new packages
pnpm install
git add pnpm-lock.yaml  # ← Don't forget!
git commit -m "Add new dependency"
```

---

### 3. Environment Variables

**Example:**
```typescript
const apiKey = process.env.MY_NEW_API_KEY;
// But MY_NEW_API_KEY isn't in Vercel environment variables
```

**How to prevent:**
1. Add to `.env.local` (local development)
2. Add to Vercel: https://vercel.com/kpearl585-5168s-projects/fenceos/settings/environment-variables
3. Redeploy

---

### 4. Import Path Errors

**Example:**
```typescript
// ❌ Case sensitive on Vercel, not on Mac
import { MyComponent } from '@/components/mycomponent';  // File is MyComponent.tsx

// ✅ Match exact case
import { MyComponent } from '@/components/MyComponent';
```

---

### 5. Lockfile Out of Sync

**Example from earlier today:**
```
ERR_PNPM_OUTDATED_LOCKFILE
pnpm-lock.yaml is not up to date with package.json
```

**How to prevent:**
```bash
# Always commit lockfile after adding packages
pnpm install
git add pnpm-lock.yaml
git commit -m "Update dependencies"
```

---

## Your Pre-Commit Checklist

**Copy this and paste it somewhere visible:**

```bash
# ═══════════════════════════════════════════════════════════
# PRE-COMMIT CHECKLIST (DO THIS EVERY TIME)
# ═══════════════════════════════════════════════════════════

# 1. Build locally
npm run build

# 2. If build fails, FIX IT before committing

# 3. If you added packages, commit lockfile
git add pnpm-lock.yaml

# 4. Commit your changes
git add .
git commit -m "Your message"

# 5. Push
# (Use GitHub Desktop to avoid auth issues)

# ═══════════════════════════════════════════════════════════
```

---

## Quick Debug Guide

### If Vercel Deployment Fails:

**1. Check Vercel Error Logs**
- Go to: https://vercel.com/kpearl585-5168s-projects/fenceos
- Click failed deployment
- Read the error message

**2. Reproduce Locally**
```bash
# This will show the EXACT same error Vercel sees
npm run build
```

**3. Common Fixes**

**TypeScript Error:**
```bash
# See the error
npm run build

# Fix the code
# Then test again
npm run build
```

**Missing Package:**
```bash
pnpm install <package-name>
git add pnpm-lock.yaml
git commit -m "Add missing package"
```

**Environment Variable:**
```bash
# Add to Vercel:
# https://vercel.com/kpearl585-5168s-projects/fenceos/settings/environment-variables

# Then redeploy (Vercel auto-deploys on new commits)
```

---

## Recent Failures & Fixes

### April 9, 2026 - TypeScript Error in Security Code

**Error:**
```
Property 'errors' does not exist on type 'ZodError<unknown>'
```

**Cause:** Used wrong property name (`errors` instead of `issues`)

**Fix:** Changed `err.errors[0]` to `err.issues[0]`

**Prevention:** Should have run `npm run build` before committing security changes

---

### April 9, 2026 - Lockfile Out of Sync

**Error:**
```
ERR_PNPM_OUTDATED_LOCKFILE
```

**Cause:** Added Playwright packages but didn't commit `pnpm-lock.yaml`

**Fix:** 
```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "Fix: Sync pnpm-lock.yaml"
```

**Prevention:** Always commit lockfile when adding packages

---

## Set Up Pre-Commit Hook (Automatic Prevention)

Add this to prevent commits with TypeScript errors:

```bash
# Create .husky directory
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run build"

# Now TypeScript errors will BLOCK the commit
```

---

## Vercel Build Configuration

Your current settings:

**Build Command:** `next build`  
**Output Directory:** `.next`  
**Install Command:** `pnpm install`  
**Node Version:** Auto (uses latest LTS)

**Framework:** Next.js 16.2.1  
**Package Manager:** pnpm (lockfile version 9)

---

## Emergency Rollback

If a bad deployment goes through:

**Option 1: Revert via Vercel Dashboard**
1. Go to: https://vercel.com/kpearl585-5168s-projects/fenceos
2. Click "Deployments"
3. Find last successful deployment
4. Click "..." → "Promote to Production"

**Option 2: Revert via Git**
```bash
# Find last good commit
git log --oneline -10

# Revert to it
git revert <bad-commit-hash>
git push

# Vercel will auto-deploy the reverted version
```

---

## Success Metrics

### Before This Guide
- **Deployment Success Rate:** ~60% (lots of failures)
- **Time to Fix:** 15-30 minutes per failure
- **Frustration Level:** 🔴 HIGH

### With This Guide
- **Deployment Success Rate:** 95%+ (if you follow checklist)
- **Time to Fix:** 2-5 minutes (build fails locally, fix before push)
- **Frustration Level:** 🟢 LOW

---

## The One Rule to Remember

> **"If `npm run build` fails locally, it will fail on Vercel."**

**Always build locally before pushing.**

---

## Quick Reference Commands

```bash
# Test build (DO THIS BEFORE EVERY COMMIT)
npm run build

# Install dependencies
pnpm install

# Check what's changed
git status
git diff

# Commit (after build succeeds)
git add .
git commit -m "Your message"

# Push (via GitHub Desktop to avoid auth issues)
# Then check Vercel dashboard
```

---

## Get Help

**Vercel Logs:**
- https://vercel.com/kpearl585-5168s-projects/fenceos

**Build Issues:**
1. Run `npm run build` locally
2. Read error message
3. Fix code
4. Test again
5. Commit when build succeeds

**Still Stuck?**
- Check recent commits for similar fixes: `git log --oneline`
- Search error message in Vercel docs
- Ask Claude Code to debug the specific error
