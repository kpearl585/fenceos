# FenceEstimatePro Security Documentation

**Last Updated:** April 16, 2026  
**Status:** Hardened (Phase 2 — full RLS audit + CSP tightening complete)

---

## Security Posture

### ✅ Implemented Security Measures

#### 1. Authentication & Authorization
- **Supabase Auth:** Email/password authentication with built-in session management
- **Row Level Security (RLS):** Database-level authorization using `get_my_org_id()`
- **Org Isolation:** All data scoped to organization ID, preventing cross-org access
- **Server-Side Validation:** Zod schemas validate all user inputs before processing

#### 2. Input Validation
- **Zod Schemas:** All server actions validate inputs with type-safe schemas
- **UUID Validation:** Prevents SQL injection via malformed IDs
- **Length Limits:** Prevents DoS via oversized inputs
- **Type Checking:** Ensures numeric fields are finite, non-negative where required

**Validated Actions:**
- `saveAdvancedEstimate` - Full input/result validation
- `getSavedEstimate` - UUID validation
- `closeoutEstimate` - Waste %, notes validation
- See `/src/lib/validation/schemas.ts` for all schemas

#### 3. Rate Limiting
- **AI Extraction:** 20 requests/hour per org (prevents API abuse). Fails CLOSED on DB error (no silent bypass).
- **PDF Generation:** 50 requests/hour per org (prevents resource exhaustion)
- **Excel Export:** 50 requests/hour per org
- **Estimate Creation:** 100 requests/hour per org (includes estimate conversion)
- **Closeout Submission:** 20 requests/hour per org
- **Login Attempts:** 5 per 15 minutes per IP (brute force protection)

**Implementation:** `/src/lib/security/rate-limit.ts`

#### 4. Error Handling
- **Sentry Integration:** All errors logged to Sentry for monitoring
- **Sanitized Error Messages:** Database/internal errors not leaked to client
- **Graceful Degradation:** Non-critical failures don't crash the app

**Example:**
```typescript
// ❌ BAD: Leaks database details
return { error: error.message }; 

// ✅ GOOD: Generic message, log internally
console.error("DB error:", error);
return { error: "Failed to save. Please try again." };
```

#### 5. Data Encryption
- **In Transit:** HTTPS enforced via Vercel
- **At Rest:** Supabase encrypts all data at rest (AES-256)
- **Session Storage:** Supabase handles JWT token security

#### 6. API Security
- **No Exposed Service Role Key:** Only used server-side
- **CORS:** Restricted to application domain
- **Server Actions:** Next.js server actions prevent CSRF
- **OpenAI API Key:** Server-side only, never exposed to client

---

## Row Level Security (RLS) Policies

All multi-tenant tables use this pattern:

```sql
CREATE POLICY "table_name_org_policy" ON table_name
  FOR ALL
  USING (org_id = get_my_org_id());
```

### get_my_org_id() Function

```sql
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT org_id 
  FROM public.profiles 
  WHERE auth_id = auth.uid()
  LIMIT 1;
$$;
```

### Protected Tables
- `fence_graphs` - Saved estimates
- `materials` - Org-specific material library
- `customers` - Customer data
- `estimates` - Quote data
- `jobs` - Job data
- `ai_extraction_log` - AI usage audit trail
- `supplier_connectors` - Price sync configuration
- `supplier_catalog_snapshots` - Supplier price data

### Audit RLS Policies

Run this SQL to verify all policies are correct:

```bash
# In Supabase SQL Editor
cat scripts/audit-rls-policies.sql
```

---

## Environment Variables Security

### ✅ Properly Secured

```bash
# .gitignore includes:
.env.local
.env.local.save
.env.sentry-build-plugin
```

### 🔴 NEVER COMMIT

```bash
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Most dangerous!
SENTRY_AUTH_TOKEN=sntryu_...
RESEND_API_KEY=re_...
```

### Where Keys Are Stored

**Local Development:**
- `/Users/pearllabs/Documents/GitHub/fenceos/.env.local` (gitignored ✅)

**Production:**
- Vercel Environment Variables (encrypted at rest ✅)

### Key Rotation Procedure

If a key is ever committed to git:

1. **Immediately rotate** in provider dashboard
2. Update Vercel environment variables
3. Update local `.env.local`
4. Redeploy application
5. Consider `git filter-branch` to scrub history (nuclear option)

---

## Rate Limit Configuration

| Operation | Limit | Window | Scope |
|-----------|-------|--------|-------|
| AI Extraction | 20 | 1 hour | Per org |
| PDF Generation | 50 | 1 hour | Per org |
| Excel Export | 50 | 1 hour | Per org |
| Estimate Creation | 100 | 1 hour | Per org |
| Login Attempts | 5 | 15 min | Per IP |

**Storage:** In-memory (Map). For production scale, consider Redis.

---

## Security Testing Checklist

### Manual Tests

**RLS Isolation:**
1. Create two test accounts in different orgs
2. As User A, try to query User B's data
3. Verify 0 rows returned (blocked by RLS)

```sql
-- Run as User A
SELECT * FROM fence_graphs WHERE org_id = '<user_b_org_id>';
-- Expected: 0 rows
```

**Input Validation:**
1. Try saving estimate with negative labor rate
2. Expected: Validation error
3. Try UUID injection: `getSavedEstimate("'; DROP TABLE users; --")`
4. Expected: UUID validation error

**Rate Limiting:**
1. Make 21 AI extraction requests in 1 hour
2. Expected: 21st request blocked

### Automated Tests

Run E2E tests with Playwright:

```bash
npm run test:e2e
```

---

## Threat Model

### Protected Against

✅ **SQL Injection:** Supabase client library + UUID validation  
✅ **XSS:** React auto-escapes + no `dangerouslySetInnerHTML`  
✅ **CSRF:** Next.js server actions include CSRF tokens  
✅ **Unauthorized Data Access:** RLS policies enforce org isolation  
✅ **Rate Limiting Bypass:** Server-side checks, not client-side  
✅ **API Key Exposure:** All keys server-side only  

### Not Yet Protected Against

🟡 **DDoS:** Basic Vercel protection, no advanced mitigation  
🟡 **Brute Force (Advanced):** IP rate limiting only, no account lockout  
🟡 **Session Hijacking:** Relies on Supabase JWT security  

### Out of Scope (Vendor Responsibility)

- **Card Data Security:** Stripe handles (PCI DSS compliant)
- **Database Encryption:** Supabase handles (AES-256)
- **Infrastructure Security:** Vercel handles

---

## Compliance

### GDPR Considerations

**Data We Collect:**
- Customer names, addresses, phone numbers, emails
- Fence project details (locations, measurements)
- Organization details
- AI extraction logs (for quality/billing)

**User Rights:**
- Right to deletion: Manual process via support
- Right to export: Database query required
- Consent: Privacy policy acceptance on signup

**Action Required:**
- [ ] Add GDPR data export tool
- [ ] Add GDPR data deletion tool
- [ ] Audit third-party data sharing (OpenAI, Sentry, Stripe)

### SOC 2 Readiness

**Controls Implemented:**
- ✅ Audit logging (AI extractions, estimate saves)
- ✅ Access controls (RLS, authentication)
- ✅ Encryption (in transit, at rest)
- ✅ Error monitoring (Sentry)

**Missing:**
- [ ] Security incident response plan
- [ ] Employee background checks
- [ ] Formal security training program
- [ ] Penetration testing report

---

## Security Incident Response

### If a Key is Leaked

1. **Immediately revoke** the key in provider dashboard
2. Generate new key
3. Update Vercel environment variables
4. Deploy new version
5. Monitor Sentry for auth errors
6. Document incident in security log

### If Unauthorized Access Detected

1. Review Sentry error logs for patterns
2. Check RLS policy audit for gaps
3. Review recent database changes
4. Notify affected users if PII exposed
5. Document incident and remediation

### If DDoS Attack

1. Monitor Vercel analytics for traffic spike
2. Contact Vercel support for mitigation
3. Consider Cloudflare if persistent
4. Review rate limits and tighten if needed

---

## Security Contacts

**Primary:** [Your Email]  
**Vendor Support:**
- Supabase: support@supabase.com
- Vercel: support@vercel.com  
- Stripe: support@stripe.com

---

## Security Audit Log

| Date | Action | Details |
|------|--------|---------|
| 2026-04-09 | Initial hardening | Added Zod validation, rate limiting, RLS audit |
| 2026-04-08 | Sentry integration | Error monitoring enabled |

---

## Next Steps (Recommended)

### High Priority (This Month)
- [ ] Add MFA/2FA support
- [ ] Implement account lockout after failed logins
- [ ] Add GDPR data export/deletion tools
- [ ] Run penetration test (hire security firm)

### Medium Priority (Next Quarter)
- [ ] Move rate limiting to Redis (for scale)
- [ ] Add security headers (CSP, X-Frame-Options)
- [ ] Implement audit log viewer for admins
- [ ] Add IP whitelisting for sensitive operations

### Low Priority (Nice to Have)
- [ ] SOC 2 compliance certification
- [ ] HIPAA compliance (if healthcare customers)
- [ ] Bug bounty program
