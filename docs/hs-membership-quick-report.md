# HS HalfSphere Membership Quick Report

Updated: 2026-06-27

This document is the short version for GyenBox, GSYEN, SGSYEN, and future products.

## One Sentence

HalfSphere / HS is the central account, membership, and permission authority. Each product reads HS authorization results; products should not create their own independent membership truth.

## Core Model

HS owns:

- user identity
- product access
- membership plans
- feature permissions
- quota limits
- membership events

Each product owns its own business logic:

- GyenBox owns files, upload, desktop sync, storage UI
- GSYEN owns AI workspace features
- SGSYEN owns its own product features

Product databases may cache display data, but HS remains the source of truth.

## Two Permission Axes

### Horizontal Product Access

One HS account can have access to multiple products:

- `halfsphere`
- `gyenbox`
- `gsyen`
- `sgsyen`

Question answered: Can this user use this product?

### Vertical Plan Level

Each product can define its own plan levels:

- `free`
- `plus`
- `professional`
- `business`

Question answered: What can this user do inside this product?

Examples:

- storage quota
- max devices
- web upload
- desktop sync
- share links
- AI file search
- team seats

## Source Of Truth

HS Supabase project:

```text
https://hrtynofmjcumuanjvpxz.supabase.co
```

Core objects:

- `auth.users`: unified login identity
- `hs_products`: product registry
- `hs_membership_plans`: plans, features, quota
- `hs_subscriptions`: user subscriptions
- `hs_current_memberships`: current membership view
- `hs_membership_events`: membership change log
- `hs_user_profiles`: user profile data

## Runtime Flow

```text
User signs in with HS Supabase Auth
  -> product frontend receives access_token
  -> product API sends user JWT to HS
  -> product API reads hs_* membership data
  -> product checks product_code + plan_code + features
  -> business API executes upload, sync, AI, or other features
```

The browser and desktop app should never decide paid access by themselves.

## Minimal Product Integration

1. Point Supabase environment variables to HS:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
```

2. Set one fixed product code:

```text
PRODUCT_CODE=gyenbox
```

or:

```text
PRODUCT_CODE=gsyen
PRODUCT_CODE=sgsyen
```

3. Add a server-side membership reader:

```text
getCurrentMembership(productCode)
```

4. Add server-side feature guards:

```text
requireFeature(productCode, featureKey)
```

5. Show membership in the UI, but enforce permissions in API/server code.

6. Write paid plan changes, upgrades, downgrades, bans, and payment callbacks back to HS only.

## GyenBox Current Rules

Product code:

```text
gyenbox
```

Before upload, GyenBox should check:

- user is signed in
- user has an active GyenBox membership
- `web_upload` is allowed
- file does not exceed `max_file_size_bytes`
- storage does not exceed `storage_quota_bytes`
- device count does not exceed `max_devices`

Current GyenBox code entry points:

- `apps/web/lib/membership.ts`
- `apps/web/lib/upload-policy.ts`
- `apps/web/app/api/membership/route.ts`
- `apps/web/app/api/upload/route.ts`
- `apps/web/components/gyenbox/member-center.tsx`

## Security Rules

- Frontend and desktop may use anon key plus user access token.
- `service_role` must stay server-side only.
- RLS must stay enabled.
- Users can read only their own membership and subscription records.
- Plan definitions can be public read.
- Subscription records must be user-isolated.
- Desktop token paste is only an MVP fallback. The final flow should use browser login callback.

## Success Checklist

- One HS account can sign in to GyenBox, GSYEN, and SGSYEN.
- Opening `gyenbox` access in HS makes GyenBox show the correct plan.
- Opening `gsyen` access in HS makes GSYEN show the correct plan.
- Changing plan quota in HS changes product behavior.
- API blocks restricted features even if the UI is modified.
- Deleting product-side cache does not destroy membership state, because HS can restore it.

## Do Not Do

- Do not put `service_role` in browser or desktop code.
- Do not let GyenBox, GSYEN, or SGSYEN independently decide paid membership.
- Do not treat a UI badge as real permission.
- Do not run `prisma migrate reset` on production.
- Do not paste only a SQL file path into Supabase SQL Editor. Paste the full SQL content.

## Related Files

- `docs/membership-system.md`
- `docs/sql/halfsphere-central-membership.sql`
- `docs/sql/halfsphere-r3-permissions-patch.sql`
- `apps/web/lib/membership.ts`
- `apps/web/lib/upload-policy.ts`
- `apps/web/components/gyenbox/member-center.tsx`
