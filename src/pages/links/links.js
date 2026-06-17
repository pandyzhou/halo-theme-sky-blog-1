/**
 * 友情链接页脚本
 * 模板位置：templates/links.html
 */
import "./links.css";
import { notifySwupPageReady, registerAlpinePageComponents, runPageInit } from "../../common/js/page-runtime.js";

// API 地址
const LINK_SUBMIT_API = "/apis/anonymous.link.submit.kunkunyu.com/v1alpha1/linksubmits/-/submit";
const LINK_GROUPS_API = "/apis/anonymous.link.submit.kunkunyu.com/v1alpha1/linkgroups";

function normalizeUrl(value) {
  try {
    return new URL(String(value || "").trim()).toString();
  } catch {
    return "";
  }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

// Alpine.js 友链提交表单组件
(function () {
  function _registerAlpineComponents() {
    Alpine.data("linkSubmitForm", () => ({
      form: {
        type: "add",
        displayName: "",
        url: "",
        logo: "",
        email: "",
        description: "",
        rssUrl: "",
        groupName: "",
      },
      groups: [],
      submitting: false,
      messageFallback: false,
      markdown: "",
      copied: false,
      result: {
        show: false,
        success: false,
        message: "",
      },

      init() {
        this.fetchGroups();
      },

      // 获取分组列表
      async fetchGroups() {
        try {
          const res = await fetch(LINK_GROUPS_API, {
            headers: {
              Accept: "application/json",
            },
          });

          if (!res.ok) {
            throw new Error(`${res.status}`);
          }

          const payload = await res.json();
          const groups = Array.isArray(payload) ? payload : payload?.items || payload?.data || [];
          this.groups = groups
            .map((group) => ({
              displayName: String(group?.displayName || group?.groupName || "").trim(),
              groupName: String(group?.groupName || "").trim(),
              priority: Number(group?.priority || 0),
            }))
            .filter((group) => group.groupName)
            .sort((left, right) => {
              if (left.priority !== right.priority) {
                return Number(left.priority) - Number(right.priority);
              }
              return left.displayName.localeCompare(right.displayName, "zh-CN");
            });

          if (!this.form.groupName && this.groups.length > 0) {
            this.form.groupName = this.groups[0].groupName;
          }
        } catch (e) {
          console.warn("获取友链分组失败:", e);
          this.enableMessageFallback("友链提交插件分组加载失败，请复制申请内容到评论区留言。");
        }
      },

      groupDisplayName() {
        const group = this.groups.find((item) => item.groupName === this.form.groupName);
        return group?.displayName || this.form.groupName || "未选择";
      },

      buildMarkdown() {
        const url = normalizeUrl(this.form.url) || String(this.form.url || "").trim() || "请补充网站地址";
        const lines = [
          "申请交换友链：",
          `- 网站名称：${String(this.form.displayName || "").trim() || "请补充网站名称"}`,
          `- 网站地址：${url}`,
          `- 头像链接：${String(this.form.logo || "").trim() || "请补充头像或 Logo 地址"}`,
          `- 网站描述：${String(this.form.description || "").trim() || "请补充一句话简介"}`,
        ];

        if (String(this.form.email || "").trim()) {
          lines.push(`- 邮箱：${String(this.form.email).trim()}`);
        }

        if (this.form.groupName) {
          lines.push(`- 申请分组：${this.groupDisplayName()}`);
        }

        if (String(this.form.rssUrl || "").trim()) {
          lines.push(`- RSS 链接：${String(this.form.rssUrl).trim()}`);
        }

        return lines.join("\n");
      },

      enableMessageFallback(message) {
        this.messageFallback = true;
        this.markdown = this.buildMarkdown();
        this.result = {
          show: true,
          success: false,
          message,
        };
      },

      async copyMarkdown() {
        this.markdown = this.buildMarkdown();

        try {
          await copyText(this.markdown);
          this.copied = true;
          this.result = {
            show: true,
            success: true,
            message: "已复制申请内容，可粘贴到下方评论区留言。",
          };
          document.getElementById("links-comments")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          setTimeout(() => {
            this.copied = false;
          }, 2000);
        } catch {
          this.result = {
            show: true,
            success: false,
            message: "复制失败，请手动复制申请内容。",
          };
        }
      },

      // 提交友链
      async submitLink() {
        if (this.messageFallback) {
          await this.copyMarkdown();
          return;
        }

        this.submitting = true;
        this.result.show = false;

        try {
          const res = await fetch(LINK_SUBMIT_API, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(this.form),
          });

          if (res.ok) {
            this.result = {
              show: true,
              success: true,
              message: "友链申请已提交，请等待站长审核！",
            };
            // 重置表单
            this.resetForm();
            // 3秒后关闭弹窗
            setTimeout(() => {
              document.getElementById("link-submit-modal")?.close();
              this.result.show = false;
            }, 3000);
          } else {
            const error = await res.json().catch(() => ({}));
            const fallbackStatuses = new Set([404, 405, 501, 502, 503]);

            if (fallbackStatuses.has(res.status)) {
              this.enableMessageFallback("友链提交接口暂不可用，已切换为评论留言申请。");
            } else {
              this.result = {
                show: true,
                success: false,
                message: error.message || "提交失败，请稍后重试",
              };
            }
          }
        } catch {
          this.enableMessageFallback("网络错误，已切换为评论留言申请。");
        } finally {
          this.submitting = false;
        }
      },

      // 重置表单
      resetForm() {
        this.form = {
          type: "add",
          displayName: "",
          url: "",
          logo: "",
          email: "",
          description: "",
          rssUrl: "",
          groupName: "",
        };
        this.messageFallback = false;
        this.markdown = "";
        this.copied = false;
      },
    }));
  }
  registerAlpinePageComponents(_registerAlpineComponents);
})();

// 友链卡片交互增强
runPageInit(() => {
  // 图片加载失败时显示默认图标
  const linkImages = document.querySelectorAll(".link-card img");
  linkImages.forEach((img) => {
    img.addEventListener("error", () => {
      img.style.display = "none";
      const fallback = img.nextElementSibling;
      if (fallback) {
        fallback.style.display = "flex";
      }
    });
  });
});

notifySwupPageReady();
