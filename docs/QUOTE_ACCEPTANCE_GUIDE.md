# Customer Quote Acceptance Portal - User Guide

## Overview

The Quote Acceptance Portal allows you to share professional quote links with customers, who can then view project details and accept quotes with an e-signature—all without requiring a login.

---

## For Contractors: Sharing Quotes

### Step 1: Generate a Quote Link

1. **Navigate to your saved estimate:**
   - Dashboard → Advanced Estimates → Saved
   - Click on the estimate you want to share

2. **Click "Share Quote" button:**
   - Located in the right sidebar
   - Only visible for non-closed estimates

3. **Configure expiration:**
   - Choose how long the link is valid:
     - 7 days (for urgent quotes)
     - 14 days (standard)
     - 30 days (default)
     - 60 days (seasonal work)
     - 90 days (long-term planning)

4. **Click "Generate Share Link":**
   - Secure URL is created instantly
   - Token is cryptographically unique (UUID)

### Step 2: Share with Customer

**Option A: Copy Link**
1. Click "Copy" button
2. Paste into email, text, or chat

**Option B: Email Link**
1. Click "Email Link"
2. Pre-filled draft opens in your email client
3. Add customer's email address
4. Send

**Option C: Preview First**
1. Click "Preview" to see customer view
2. Verify all details are correct
3. Then share via copy or email

### Step 3: Monitor Acceptance

**In Dashboard:**
- Estimate status updates from "draft" to "accepted"
- Green "Accepted" badge appears
- Timestamp shows when customer accepted

**Via Email (Phase 2):**
- You'll receive notification when customer accepts
- (Currently: check dashboard manually)

---

## For Customers: Accepting Quotes

### What Customers See

**Quote Page Includes:**
1. **Header:**
   - Your company name and logo
   - Project name
   - Acceptance status

2. **Project Details:**
   - Fence type and height
   - Total linear feet
   - Number of gates
   - Breakdown by section (if multiple runs)

3. **Pricing:**
   - Total project cost
   - What's included checklist:
     - All materials
     - Professional installation
     - Site cleanup
     - 2-year workmanship warranty
     - Manufacturer materials warranty

4. **Acceptance Form:**
   - E-signature field (type full name)
   - Legal terms preview
   - "Accept Quote & Sign" button

5. **Contact Information:**
   - Your phone, email, address
   - Easy access for questions

### Customer Acceptance Process

1. Customer clicks link from your email/text
2. Reviews all project details and pricing
3. Types their full name in signature field
4. Reviews terms and conditions
5. Clicks "Accept Quote & Sign"
6. Sees confirmation message
7. Page refreshes to show "Accepted" status

**What Gets Recorded:**
- Customer's typed signature (full name)
- Date and time of acceptance
- Customer's IP address (legal record)
- Browser information (fraud detection)

---

## Common Scenarios

### Scenario 1: Customer Requests Changes

**Problem:** Customer wants to modify the quote before accepting.

**Solution:**
1. Customer contacts you via phone/email
2. You edit the estimate in your dashboard
3. Generate a NEW quote link
4. Send updated link to customer
5. Old link remains valid unless expired

**Note:** Currently, you cannot revoke old links. Set shorter expiration if you anticipate changes.

### Scenario 2: Quote Expires

**Problem:** Customer tries to access link after expiration.

**What Happens:**
- Yellow warning banner: "Quote has expired"
- Customer can still view details
- Cannot accept expired quote
- Contact information shown for renewal

**Solution:**
1. Customer contacts you
2. You verify pricing is still valid
3. Generate new link with updated expiration
4. Send new link

### Scenario 3: Customer Needs Clarification

**Problem:** Customer has questions before accepting.

**What They See:**
- Your contact info prominently displayed
- Phone, email, address

**Best Practice:**
- Answer questions promptly
- Update estimate if needed
- Generate new link if significant changes

### Scenario 4: Customer Already Accepted

**Problem:** Customer clicks link again after accepting.

**What Happens:**
- Green success banner: "Quote Accepted!"
- Shows acceptance timestamp
- Cannot re-accept
- Contact info shown for next steps

---

## Security & Legal

### Security Measures

**Token Security:**
- 128-bit UUID (2^128 possible combinations)
- Impossible to guess or brute force
- One-time use (invalid after acceptance)
- Configurable expiration

**Data Protection:**
- No customer account required (reduces data liability)
- IP address logged for fraud detection
- User agent tracked for security
- HTTPS encryption in transit

**Authorization:**
- Only you can generate links for your estimates
- Customers cannot access other quotes
- Database enforces organization isolation

### Legal Considerations

**E-Signature Validity:**
- Complies with ESIGN Act (2000)
- Legally binding electronic signature
- Records:
  - Typed full name
  - Timestamp
  - IP address
  - User agent

**Terms & Conditions:**
- Customer must review before accepting
- Includes:
  - Quote validity period
  - Deposit requirements
  - Site conditions disclaimer
  - Timeline disclaimer
  - Final contract requirement

**What This Is NOT:**
- Not a final contract (contract follows acceptance)
- Not a payment (deposit collected separately)
- Not a work authorization (requires formal contract)

**What This IS:**
- Customer's intent to proceed
- Agreement to quoted scope and price
- Basis for creating formal contract
- Legal record of customer agreement

---

## Best Practices

### Do's

✅ **Set realistic expiration dates**
- 30 days for most quotes
- 7-14 days if prices are volatile
- 60-90 days for seasonal work scheduled far out

✅ **Preview before sending**
- Verify pricing is correct
- Check customer information
- Ensure project details are accurate

✅ **Follow up after acceptance**
- Call customer to thank them
- Schedule installation
- Send formal contract
- Collect deposit

✅ **Keep estimates up to date**
- Don't share old estimates with outdated prices
- Generate new link if material costs change
- Update timeline expectations if crew availability shifts

✅ **Use professional email templates**
- Include personal greeting
- Brief project summary
- Clear call-to-action ("Click to review and accept")
- Your contact info for questions

### Don'ts

❌ **Don't share links publicly**
- Links contain customer and pricing info
- Share only with intended customer

❌ **Don't reuse links**
- Generate fresh link for each customer
- Don't copy/paste same link to multiple customers

❌ **Don't skip follow-up**
- Acceptance is step 1, not the finish line
- Customer expects you to reach out next

❌ **Don't ignore expired quotes**
- If customer contacts after expiration, respond quickly
- Generate new link if pricing still valid

❌ **Don't forget to close estimates**
- After job completion, close the estimate
- This feeds into your accuracy calibration

---

## Troubleshooting

### Customer Can't Access Link

**Symptoms:**
- "Quote not found" error
- "Invalid token" message

**Possible Causes:**
1. Link was miscopied (missing characters)
2. Token has expired
3. Email client mangled the URL

**Solutions:**
1. Resend link (copy carefully)
2. Generate new link with longer expiration
3. Use link shortener if needed
4. Send as plain text, not formatted HTML

### Customer Sees "Already Accepted"

**Cause:**
- Quote was already accepted (maybe by mistake)

**Solutions:**
1. Check your dashboard for acceptance timestamp
2. If customer didn't accept, might be fraud (check IP address)
3. Generate new estimate/link if needed

### Link Works But Customer Can't Accept

**Symptoms:**
- Accept button is disabled
- Signature field doesn't work

**Possible Causes:**
1. Browser compatibility (old browser)
2. JavaScript disabled
3. Ad blocker interfering

**Solutions:**
1. Try different browser (Chrome, Edge, Safari)
2. Disable ad blockers
3. Enable JavaScript
4. Use desktop instead of mobile if issues persist

### You Can't Generate Link

**Symptoms:**
- "Share Quote" button doesn't appear

**Possible Causes:**
1. Estimate is already closed
2. You don't have permission (Viewer role)

**Solutions:**
1. Un-close estimate if needed
2. Ask Admin to share quote
3. Duplicate estimate and share the copy

---

## FAQ

**Q: Can customers download the quote as PDF?**  
A: Not directly from the acceptance page (Phase 2 feature). You can send them the PDF proposal separately.

**Q: Will customers get a receipt after accepting?**  
A: Not automatically yet (Phase 2). You should email them confirmation.

**Q: Can I see who viewed the quote but didn't accept?**  
A: Not yet. Currently only tracks acceptances (analytics in Phase 2).

**Q: Can I customize what customers see on the quote page?**  
A: Partially. Update your company branding in Settings → Company Profile. Full customization coming in future.

**Q: What happens if I delete the estimate after sharing?**  
A: Link will break. Don't delete estimates that have active links. Close them instead.

**Q: Can I un-accept a quote if customer changes mind?**  
A: No automatic way. Edit the estimate, mark as "revision needed", and generate new link.

**Q: How do I know if customer accepted?**  
A: Check estimate status in dashboard. Shows "Accepted" badge with timestamp. Email notification coming in Phase 2.

**Q: Can I share quotes for the simple estimate builder?**  
A: Currently only works with Advanced Estimates. Simple estimate support coming soon.

**Q: Does this work on mobile?**  
A: Yes! Both contractor and customer views are mobile-responsive.

**Q: Can I require a deposit payment before acceptance?**  
A: Not yet. Phase 2 will integrate Stripe for deposit collection.

---

## Metrics to Track

**Conversion Rate:**
- Quotes sent vs. quotes accepted
- Target: 60-70% acceptance rate
- Track in spreadsheet or wait for built-in analytics

**Time to Accept:**
- How long from link sent to acceptance
- Industry average: 3-7 days
- Faster = better pricing/customer fit

**Expiration Rate:**
- How many quotes expire before acceptance
- High rate = set longer expiration or follow up sooner

---

## Advanced Tips

### Tip 1: Personalize the Email

Instead of just sending a link, write a personal message:

```
Hi [Customer Name],

It was great speaking with you about your fence project!

I've prepared a detailed quote for your [project description]:
[Quote Link]

The quote includes:
- [Specific fence type] at [height] feet
- [Number] gates for easy access
- All materials and professional installation
- 2-year workmanship warranty

This quote is valid for 30 days. Click the link above to review 
all the details and accept with a quick e-signature.

Have questions? Just call me at [phone] or reply to this email.

Looking forward to working with you!

[Your Name]
[Company Name]
```

### Tip 2: Follow Up Timeline

**Day 1:** Send quote link  
**Day 3:** Follow-up email: "Have you had a chance to review?"  
**Day 7:** Phone call: "Any questions about the quote?"  
**Day 14:** Final follow-up before expiration  

### Tip 3: Use Expiration Strategically

**Short (7 days):**
- Hot leads ready to decide
- Volatile material prices
- Competitive situations

**Medium (30 days):**
- Standard residential projects
- Stable pricing environment

**Long (60-90 days):**
- Winter quotes for spring work
- Large commercial projects
- Pre-construction planning

---

## Support

**For technical issues:**
- Email: support@fenceestimatepro.com
- Help Center: /help

**For legal questions:**
- Consult your attorney regarding e-signature compliance in your state
- Review terms & conditions shown to customers

---

**Last Updated:** April 9, 2026  
**Feature Version:** 1.0.0  
**Next Update:** Phase 2 (Email notifications, deposit payments)
