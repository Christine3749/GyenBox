import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = Number(process.env.SAFEAUTH_PORT ?? 3001);
const HOST = "127.0.0.1";

app.use(express.json());

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "SafeAuth Vault Server" });
});

/**
 * AI Security Audit Endpoint
 * IMPORTANT SECURITY GUARANTEE:
 * This endpoint ONLY processes non-sensitive account metadata (counts, categories, timestamps).
 * TOTP secret keys and generated codes NEVER leave the client browser.
 */
app.post("/api/security-audit", async (req, res) => {
  const daysSinceBackup = Number(req.body?.daysSinceLastBackup) || 0;
  const unusedCount = Number(req.body?.unusedAccountsCount90Days) || 0;

  res.json({
    success: true,
    data: {
      healthScore: Math.max(60, 100 - daysSinceBackup * 3 - unusedCount * 8),
      summary: `本地元数据体检完成：${unusedCount > 0 ? `${unusedCount} 个账号超过 90 天未使用，` : ""}${daysSinceBackup > 3 ? `距离上次备份已 ${daysSinceBackup} 天` : "账号安全状态良好"}。`,
      recommendations: [
        ...(daysSinceBackup > 3
          ? [{ id: "rec_backup", severity: daysSinceBackup > 7 ? "high" : "medium", title: "加密备份提醒", description: `您已有 ${daysSinceBackup} 天未导出本地加密备份，建议立即备份。`, actionType: "backup" }]
          : []),
        ...(unusedCount > 0
          ? [{ id: "rec_unused", severity: "medium", title: "清理长期未使用账号", description: `检测到 ${unusedCount} 个账号超过 90 天未使用，建议确认服务状态或移除旧凭据。`, actionType: "review_unused" }]
          : []),
        { id: "rec_local", severity: "low", title: "本地加密保险箱状态正常", description: "安全体检不读取、不上传 TOTP 密钥或动态验证码。", actionType: "general" },
      ],
    },
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[SafeAuth Vault] Local-only server listening on http://${HOST}:${PORT}`);
  });
}

startServer();
