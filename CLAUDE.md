# Claude Code Workflow for FenceEstimatePro

This file contains persistent instructions for Claude Code when working on this project.

---

## 🚨 CRITICAL: Pre-Commit Build Validation

**EVERY commit MUST pass a build test before being committed.**

### Workflow (MANDATORY)

```bash
# 1. Make code changes
# 2. ALWAYS run build BEFORE committing
npm run build

# 3. If build fails → FIX IT before committing
# 4. Only commit when build succeeds
git add .
git commit -m "Your message"

# 5. Push via GitHub Desktop (avoids auth issues)
```

### Why This Matters

**Without build testing:**
- Code gets committed with TypeScript errors
- Push triggers Vercel deployment
- Deployment fails
- User sees "failed deployment" in Vercel
- Wastes time debugging on Vercel instead of locally

**With build testing:**
- TypeScript errors caught locally BEFORE commit
- Fix errors immediately with full context
- Only working code gets committed
- Vercel deployments succeed
- User happy, no wasted time

### Automated Enforcement

Pre-commit hook is installed at `.husky/pre-commit` that automatically runs `npm run build`.

**If build fails → commit is blocked automatically.**

---

## Common Build Issues to Watch For

### 1. TypeScript Errors

```typescript
// ❌ WRONG: Type errors
const result = someFunction();  // Missing type annotation
return result.data.items;  // Property might not exist

// ✅ CORRECT: Proper types
const result: ResultType = someFunction();
return result?.data?.items ?? [];
```

### 2. Zod Error Handling

```typescript
// ❌ WRONG: Zod uses 'issues', not 'errors'
catch (err) {
  if (err instanceof z.ZodError) {
    return err.errors[0].message;  // Type error!
  }
}

// ✅ CORRECT: Use 'issues' property
catch (err) {
  if (err instanceof z.ZodError) {
    const firstError = err.issues[0];
    return firstError?.message || "Validation failed";
  }
}
```

### 3. Import Path Case Sensitivity

```typescript
// ❌ WRONG: Case mismatch (fails on Vercel, not on Mac)
import { MyComponent } from '@/components/mycomponent';

// ✅ CORRECT: Exact case match
import { MyComponent } from '@/components/MyComponent';
```

### 4. Missing Dependencies

```bash
# After installing packages, ALWAYS commit lockfile
pnpm install <package>
git add pnpm-lock.yaml
git commit -m "Add package: <package>"
```

---

## Security Requirements

All server actions must include:

1. **Input Validation** - Use Zod schemas from `/src/lib/validation/schemas.ts`
2. **Rate Limiting** - Use rate limiters from `/src/lib/security/rate-limit.ts`
3. **Error Sanitization** - Never leak database errors to client
4. **Auth Checks** - Always verify user authentication
5. **Org Isolation** - Always filter by `org_id` via RLS

Example:
```typescript
export async function myServerAction(input: unknown) {
  try {
    // 1. Validate input
    const validated = MySchema.parse(input);
    
    // 2. Check auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    
    // 3. Rate limit
    const rateLimit = RateLimiters.myOperation(orgId);
    if (!rateLimit.success) return { error: rateLimit.error };
    
    // 4. Do work (RLS handles org isolation)
    // ...
    
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return { error: `Validation failed: ${firstError?.message}` };
    }
    console.error("Server error:", err);
    return { error: "An error occurred. Please try again." };
  }
}
```

---

## Database Changes

### RLS Policy Pattern

All tables with `org_id` must use this RLS pattern:

```sql
CREATE POLICY "table_name_org_policy" ON table_name
  FOR ALL
  USING (org_id = get_my_org_id());
```

### Migration Workflow

1. Create migration file in `supabase/migrations/`
2. Test in local Supabase
3. Review with RLS audit script: `scripts/audit-rls-policies.sql`
4. Deploy to production
5. Verify in production database

---

## Git Commit Messages

Follow conventional commits:

```bash
# Format: <type>: <description>

# Types:
feat: New feature
fix: Bug fix
docs: Documentation only
style: Code style (formatting, semicolons)
refactor: Code change that neither fixes bug nor adds feature
test: Adding tests
chore: Build process or auxiliary tools

# Examples:
git commit -m "feat: Add PDF export rate limiting"
git commit -m "fix: TypeScript error in Zod error handling"
git commit -m "docs: Update security documentation"
```

Always include Co-Authored-By:
```bash
git commit -m "feat: Your message

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Testing Before Deployment

### Required Tests

```bash
# 1. TypeScript check
npm run build

# 2. Lint check (if strict)
npm run lint

# 3. E2E smoke tests (if critical changes)
npm run test:e2e
```

### When to Run Full E2E Tests

- Changes to authentication flow
- Changes to payment flow
- Changes to core calculation engine
- Before major releases

---

## Environment Variables

### Never Commit These

```bash
.env.local
.env.sentry-build-plugin
```

### Adding New Environment Variables

1. Add to `.env.local` (local development)
2. Add to `.env.example` (documentation only, no real values)
3. Add to Vercel: https://vercel.com/kpearl585-5168s-projects/fenceos/settings/environment-variables
4. Document in `docs/SECURITY.md` if security-sensitive

---

## Emergency Procedures

### Rollback Bad Deployment

**Option 1: Via Vercel Dashboard**
1. Go to https://vercel.com/kpearl585-5168s-projects/fenceos
2. Deployments → Find last good deployment
3. Click "..." → "Promote to Production"

**Option 2: Via Git**
```bash
git revert <bad-commit-hash>
git push
```

### Fix Broken Build

```bash
# 1. Test locally
npm run build

# 2. Read error carefully
# 3. Fix the specific issue
# 4. Test again
npm run build

# 5. Commit fix
git add .
git commit -m "fix: Build error description"
git push
```

---

## Documentation Standards

### When to Update Docs

- New features → Update README or feature docs
- Security changes → Update `docs/SECURITY.md`
- API changes → Update relevant docs
- Build/deploy changes → Update `docs/DEPLOYMENT_TROUBLESHOOTING.md`

### Doc Locations

- `README.md` - Project overview, quick start
- `docs/SECURITY.md` - Security posture, threat model
- `docs/DEPLOYMENT_TROUBLESHOOTING.md` - Deployment issues
- `scripts/audit-rls-policies.sql` - Database security audit

---

## Project-Specific Patterns

### File Organization

```
src/
├── app/                  # Next.js app router
│   └── dashboard/       # Protected dashboard pages
├── lib/
│   ├── fence-graph/     # Calculation engine
│   ├── security/        # Rate limiting, validation
│   └── validation/      # Zod schemas
└── components/          # React components

scripts/                 # Utility scripts, audits
docs/                   # Documentation
supabase/
└── migrations/         # Database migrations
```

### Naming Conventions

- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Database tables: `snake_case`

---

## Key Reminders

1. ✅ **ALWAYS run `npm run build` before committing**
2. ✅ Validate all user inputs with Zod
3. ✅ Rate limit expensive operations
4. ✅ Sanitize error messages
5. ✅ Test RLS policies after DB changes
6. ✅ Document security-sensitive changes
7. ✅ Use conventional commit messages
8. ✅ Never commit environment variables
9. ✅ Keep dependencies up to date
10. ✅ Write clear, maintainable code

---

**Last Updated:** April 9, 2026  
**Project:** FenceEstimatePro  
**Stack:** Next.js 16, TypeScript, Supabase, Vercel
