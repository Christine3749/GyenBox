# HalfSphere Membership System

HalfSphere is the central identity and membership authority for GyenBox, GSYEN, SGSYEN, and future products.

The model has two permission axes:

- Horizontal access: which products a user can use, stored by `hs_subscriptions.product_code`.
- Vertical entitlements: what features and limits the user gets inside that product, stored by `hs_membership_plans` and `features`.

## Source Of Truth

Use the HalfSphere Supabase project:

```text
https://hrtynofmjcumuanjvpxz.supabase.co
```

The `hs_*` tables are the source of truth for membership. Product databases may cache quota for UX, but must not become the authority.

## Apply SQL

Open Supabase SQL Editor for the HalfSphere project and run these files in order:

```text
docs/sql/halfsphere-central-membership.sql
docs/sql/halfsphere-r3-permissions-patch.sql
```

Do not paste a file path into SQL Editor. Paste the SQL contents.

Windows clipboard helpers:

```powershell
Get-Content C:\Users\Ethan\Desktop\01-Projects\GyenBox\docs\sql\halfsphere-central-membership.sql -Raw | Set-Clipboard
Get-Content C:\Users\Ethan\Desktop\01-Projects\GyenBox\docs\sql\halfsphere-r3-permissions-patch.sql -Raw | Set-Clipboard
```

## Runtime Flow

```text
User signs in with HS Supabase Auth
  -> product sends user JWT to its API
  -> product API reads HS membership through RLS
  -> product enforces storage, device, upload, AI, and sharing limits
```

GyenBox uses `product_code = 'gyenbox'`. GSYEN should use `product_code = 'gsyen'`. SGSYEN should use `product_code = 'sgsyen'`.

## What To Test First

1. Sign in to GyenBox.
2. Open Billing / Membership.
3. Confirm plans load from HS.
4. Activate Free membership if needed.
5. Upload a small file.
6. Confirm upload respects the GyenBox plan quota.

## Safety Rules

- Never run `prisma migrate reset` against production.
- Do not run the old `20260627012000_membership_system` migration in Supabase SQL Editor.
- Keep paid upgrades and admin changes server-side or inside HS admin tooling.
- Client-side badges and cached tiers are display only; enforcement belongs in product APIs.