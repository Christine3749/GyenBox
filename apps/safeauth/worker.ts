interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
}

interface AuditMetadata {
  daysSinceLastBackup?: number;
  unusedAccountsCount90Days?: number;
}

type AuditRecommendation = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  actionType: "backup" | "review_unused" | "check_hidden" | "general";
};

function createAuditResponse(metadata: AuditMetadata) {
  const daysSinceBackup = Number(metadata.daysSinceLastBackup) || 0;
  const unusedCount = Number(metadata.unusedAccountsCount90Days) || 0;
  const recommendations: AuditRecommendation[] = [];

  if (daysSinceBackup > 3) {
    recommendations.push({
      id: "rec_fallback_backup",
      severity: daysSinceBackup > 7 ? "high" : "medium",
      title: "加密备份提醒",
      description: `您已有 ${daysSinceBackup} 天未导出本地加密备份，建议立即备份。`,
      actionType: "backup",
    });
  }

  if (unusedCount > 0) {
    recommendations.push({
      id: "rec_fallback_unused",
      severity: "medium",
      title: "清理僵尸账号",
      description: `检测到 ${unusedCount} 个账号超过 90 天未复制或使用，建议确认服务状态或移除旧凭据。`,
      actionType: "review_unused",
    });
  }

  recommendations.push({
    id: "rec_fallback_zero_trust",
    severity: "low",
    title: "零知识安全体系保持正常",
    description: "密钥仅在本地加解密，安全体检不接收任何 TOTP 密钥或动态验证码。",
    actionType: "general",
  });

  return {
    success: true,
    data: {
      healthScore: Math.max(60, 100 - daysSinceBackup * 3 - unusedCount * 8),
      summary: `元数据体检完成：${unusedCount > 0 ? `${unusedCount} 个账号超过 90 天未使用，` : ""}${daysSinceBackup > 3 ? `距离上次备份已 ${daysSinceBackup} 天` : "账号安全状态良好"}。`,
      recommendations,
    },
  };
}

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return withSecurityHeaders(Response.json({ status: "ok", service: "SafeAuth Vault" }));
    }

    if (url.pathname === "/api/security-audit" && request.method === "POST") {
      let metadata: AuditMetadata = {};
      try {
        metadata = (await request.json()) as AuditMetadata;
      } catch {
        return withSecurityHeaders(Response.json({ success: false, error: "请求数据格式无效" }, { status: 400 }));
      }

      return withSecurityHeaders(Response.json(createAuditResponse(metadata)));
    }

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
};
