# V2 Deployment Checklist

## ✅ Pre-Launch (Do This First)

### 1. Test Locally
- [ ] Run `pnpm dev`
- [ ] Visit http://localhost:3000/v2
- [ ] Test on desktop (Chrome, Safari, Firefox)
- [ ] Test on mobile (iPhone, Android)
- [ ] **Test in bright sunlight** (take phone outside)
- [ ] Check all links work
- [ ] Verify CTAs go to correct anchors
- [ ] Test FAQ accordion functionality

### 2. Replace Placeholders
- [ ] **Hero screenshot** - Use REAL estimate from production (blur customer name)
- [ ] **Video section** - Either record video or remove section
- [ ] **Testimonial avatars** - Add real photos or use initials
- [ ] Verify all email links point to correct address

### 3. Content Review
- [ ] Proofread all copy for typos
- [ ] Check phone numbers format correctly
- [ ] Verify pricing is accurate ($49/month)
- [ ] Confirm feature list matches actual product
- [ ] Double-check stats (47+ contractors, 38% margin, etc.)

### 4. SEO & Meta
- [ ] Page title is compelling
- [ ] Meta description under 160 chars
- [ ] OG image set (create screenshot of hero)
- [ ] Twitter card configured

---

## 🧪 A/B Test Setup (Week 1-2)

### 5. Set Up Testing
- [ ] Choose A/B testing tool (Vercel Edge Config, Optimizely, or custom)
- [ ] Set up 50/50 traffic split
- [ ] Configure tracking events:
  - Hero CTA clicks
  - Scroll depth (25%, 50%, 75%, 100%)
  - Video play
  - Pricing CTA clicks
  - Trial signup form submission
- [ ] Set up heatmap tool (Hotjar, Microsoft Clarity)

### 6. Monitoring
- [ ] Add Google Analytics to v2 page
- [ ] Set up conversion goals
- [ ] Create dashboard for daily metrics
- [ ] Schedule daily check-ins for first week

---

## 🚀 Soft Launch (Optional)

### 7. Limited Release
- [ ] Deploy v2 to separate route (/v2 or /new)
- [ ] Share with 5-10 existing contractors
- [ ] Ask for brutally honest feedback:
  - "Would you sign up from this page?"
  - "What's confusing?"
  - "What's missing?"
- [ ] Make quick fixes based on feedback

---

## 📊 Full A/B Test Launch

### 8. Deploy to Production
```bash
# Option A: Replace main page
git mv src/app/page.tsx src/app/page-old.tsx
git mv src/app/v2/page.tsx src/app/page.tsx

# Option B: Keep v2 as separate route
# (Already done - v2 is at /v2)

git add -A
git commit -m "Deploy V2 redesign for A/B testing"
git push
```

### 9. Monitor First 48 Hours
- [ ] Check error logs (Sentry)
- [ ] Monitor page load times
- [ ] Watch conversion rate hourly
- [ ] Check mobile vs desktop split
- [ ] Read user session recordings

### 10. Week 1 Analysis
Track these metrics:

| Metric | V1 (Old) | V2 (New) | Change |
|--------|----------|----------|--------|
| Trial signups | _____% | _____% | _____ |
| Bounce rate | _____% | _____% | _____ |
| Avg time on page | _____s | _____s | _____ |
| Scroll to pricing | _____% | _____% | _____ |
| Mobile conversion | _____% | _____% | _____ |

**Decision point:** If v2 is +10% or better on signups, continue. If worse, investigate why.

---

## 🎯 Week 2: Optimize Winner

### 11. If V2 is Winning
- [ ] Increase traffic to 75% v2, 25% v1
- [ ] Test headline variations:
  - "5 Minutes. Not 45."
  - "Accurate Estimates in 5 Minutes"
  - "Stop Underbidding Fence Jobs"
- [ ] Test CTA button copy:
  - "Start Free Trial"
  - "Try It Free for 14 Days"
  - "Get Started Free"
- [ ] Test hero screenshot variations
- [ ] A/B test video vs no video

### 12. If V1 is Winning
- [ ] Analyze why (check heatmaps, recordings)
- [ ] Interview contractors who bounced from v2
- [ ] Identify specific sections that underperform
- [ ] Create v2.1 with fixes
- [ ] Retest

---

## ✅ Full Deployment (Week 3-4)

### 13. Deploy Winner to 100%
- [ ] Route all traffic to winning version
- [ ] Update sitemap
- [ ] Submit to Google Search Console
- [ ] Archive losing version
- [ ] Document results

### 14. Post-Launch Optimization
- [ ] Set up retargeting pixel for non-converters
- [ ] Add exit-intent popup ("Wait! Get 20% off...")
- [ ] Implement live chat
- [ ] Create "See How It Works" video
- [ ] Add customer logo bar if you get permission

---

## 🔥 Emergency Rollback Plan

If something breaks:

```bash
# Revert to old version immediately
git revert HEAD
git push

# Or redirect /v2 traffic
# Add to next.config.js:
# redirects: [{ source: '/v2', destination: '/', permanent: false }]
```

**Have Vercel dashboard open during launch to quickly revert deployment if needed.**

---

## 📈 Success Criteria

### Declare V2 Successful If:
- ✅ Trial signup rate +15% or higher
- ✅ Bounce rate decreased by 10%+
- ✅ Mobile conversion improved
- ✅ No increase in load time
- ✅ Positive contractor feedback

### Declare V2 Failed If:
- ❌ Signup rate decreases >5%
- ❌ Bounce rate increases significantly
- ❌ Users confused (heat maps show no clicks)
- ❌ Page loads slow (>3s)
- ❌ Negative feedback from contractors

---

## 🎓 Lessons to Document

After test completes, document:

1. **What worked:**
   - Which sections drove most conversions
   - Which headlines performed best
   - Desktop vs mobile differences
   - Time-of-day patterns

2. **What didn't work:**
   - Where users dropped off
   - Confusing sections
   - Unnecessary content

3. **Surprises:**
   - Unexpected high performers
   - Features contractors didn't care about
   - Mobile vs desktop behavior differences

4. **Next experiments:**
   - What to test next
   - New hypotheses
   - Ideas from user feedback

---

## ⚡ Quick Reference

**View v2 locally:**
```bash
pnpm dev
# Visit: http://localhost:3000/v2
```

**Deploy to production:**
```bash
git add -A
git commit -m "Deploy V2 redesign"
git push
```

**Monitor performance:**
- Analytics: https://analytics.google.com
- Errors: https://sentry.io
- Deployments: https://vercel.com

**Rollback if needed:**
```bash
git revert HEAD && git push
```

---

## 📞 Get Help

**Technical issues:** Check Vercel logs  
**Design questions:** Review V2_REDESIGN_README.md  
**Conversion issues:** Check Google Analytics + Hotjar

---

## 🏁 Final Check Before Launch

- [ ] All placeholders replaced with real content
- [ ] Tested on phone in bright light
- [ ] Proofread all copy
- [ ] Analytics tracking configured
- [ ] Rollback plan ready
- [ ] Team knows launch is happening
- [ ] Monitoring dashboard open

**READY TO LAUNCH!** 🚀
