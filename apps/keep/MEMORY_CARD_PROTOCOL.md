# Keep Memory Card Protocol v1

Keep 学习卡片是独立资源，不属于剪贴板同步流，也不会由输入法每次按键
自动创建。只有用户明确保存或已授权的学习投影才能进入这个 API。

## Endpoints

```text
GET    /api/memory/cards?kind=word_origin&limit=100
POST   /api/memory/cards
PATCH  /api/memory/cards/:id
DELETE /api/memory/cards/:id
```

所有请求必须经过现有 GY/Supabase 账户认证，并按 `ownerId` 隔离。

## Create example

```json
{
  "clientId": "device-a-card-001",
  "kind": "word_origin",
  "surface": "transport",
  "meaning": "运输；交通",
  "origin": "trans = 穿过，port = 搬运",
  "relatedWords": ["import", "export", "portable"],
  "examples": ["Public transport is convenient."],
  "source": "ai",
  "confidence": 0.86,
  "approved": true,
  "privacy": "account"
}
```

## Safety rules

- `local-only` 卡片不能上传到 Keep；
- `clientId` 用于幂等重试，同一账户不会重复创建；
- `surface`、词源、例句和关联词都有长度上限；
- 只有账户自己的卡片可以读取、修改或删除；
- AI 结果必须先显示给用户，用户确认后再提交 `approved: true`；
- 密码框、邮箱和原始按键流不属于该接口。

公共词库仍由 `ciku.gyenbox.com` 管理；Keep 只保存个人长期学习记忆。
