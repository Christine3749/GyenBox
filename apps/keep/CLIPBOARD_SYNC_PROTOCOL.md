# GY Clipboard Sync Protocol

Keep is the authoritative, owner-scoped timeline for GY clipboard blocks.
Native clients retain a reliable local outbox and a local `HEAD(20)` view, but
never use their wall clock as the cross-device ordering authority.

## Ordering and delivery

- Every committed text or PNG block receives an owner-local, server-assigned
  `sequence`.
- `POST /api/clipboard/sync` and `PUT /api/clipboard/images/:id?format=ack-v3`
  return `{ ack: { id, sequence }, cursor }`. Retrying the same source ID is
  idempotent and returns the original ACK.
- `GET /api/clipboard/sync?snapshot=1` returns the confirmed `HEAD(20)` plus
  the latest cursor. It is for first install and recovery only.
- `GET /api/clipboard/sync?cursor=N` returns at most 64 ordered ADD/DELETE
  events after `N`; continue while `hasMore` is true.
- `GET /api/clipboard/stream?cursor=N` is only a short-lived SSE wake signal.
  Clients always fetch `/sync?cursor=...` for the authoritative data.

Soft-deleting, archiving, and restoring a clipboard block appends a DELETE or
fresh ADD event. Clipboard tombstones are retained, so a device that was offline
can still remove an old item from its local window.

## Device identities and colour

Native clients may send these optional headers on text and image commits:

```http
X-GY-Device-ID: stable-opaque-device-id
X-GY-Device-Name: ThinkPad
```

The ID is scoped to the signed-in owner. Keep registers/touches the device,
stores its assigned colour, and records the source device on the new ADD event.
The optional identity is deliberately backward compatible: released v1-v3
clients that omit it continue to work.

`GET /api/clipboard/devices` returns the owner's persisted device map.
`POST /api/clipboard/devices` registers `{ id, name }` idempotently.
`PATCH /api/clipboard/devices` permits `{ id, name?, color? }`, where `color`
is one of `blue`, `coral`, `mint`, `amber`, `violet`, or `silver`.

## Wire versions

The default `/sync` payload remains **wire v3** and is byte-compatible with the
already released native parser.

Clients ready to render source-device activity request `format=wire-v4` on
snapshot, change, and stream requests. v4 appends `originDeviceId` as the final
field of each `T`, `I`, or `D` line. No existing field changes position.

## Deployment order

1. Apply Prisma migration `20260807060000_keep_clipboard_devices`.
2. Deploy Keep with the new API routes.
3. Upgrade native clients to send the device headers and request wire v4.
4. Only then enable device-coloured Pulse animations in the clients.
