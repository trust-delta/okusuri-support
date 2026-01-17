/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ========================================
    // 循環依存の禁止
    // ========================================
    {
      name: "no-circular",
      severity: "error",
      comment: "循環依存を禁止します（.context/project.md: 循環依存禁止）",
      from: {},
      to: {
        circular: true,
      },
    },

    // ========================================
    // Feature間の直接依存禁止（@x/経由のみ許可）
    // ========================================
    {
      name: "no-feature-to-feature-direct",
      severity: "error",
      comment:
        "feature間の直接依存を禁止します。@x/ディレクトリ経由でのみ許可（.context/architecture.md）",
      from: {
        path: "^app/_shared/features/([^/]+)/",
      },
      to: {
        path: "^app/_shared/features/([^/]+)/",
        pathNot: [
          // 同一feature内は許可
          "^app/_shared/features/$1/",
          // @x/ディレクトリ経由は許可
          "^app/_shared/features/[^/]+/@x/",
        ],
      },
    },

    // ========================================
    // convex → app への依存禁止
    // ========================================
    {
      name: "no-convex-to-app",
      severity: "error",
      comment:
        "バックエンド(convex)からフロントエンド(app)への依存を禁止します",
      from: {
        path: "^convex/",
        pathNot: "^convex/_generated/",
      },
      to: {
        path: "^app/",
      },
    },

    // ========================================
    // ページ間の直接依存禁止
    // ========================================
    {
      name: "no-page-to-page",
      severity: "error",
      comment: "ページコンポーネントから他のページへの直接依存を禁止します",
      from: {
        path: "^app/\\(private\\)/[^/]+/page\\.tsx$|^app/\\(public\\)/[^/]+/page\\.tsx$",
      },
      to: {
        path: "^app/\\(private\\)/[^/]+/page\\.tsx$|^app/\\(public\\)/[^/]+/page\\.tsx$",
      },
    },

    // ========================================
    // UIコンポーネントの依存制限
    // ========================================
    {
      name: "no-ui-to-features",
      severity: "error",
      comment:
        "UIコンポーネントはfeaturesに依存してはいけません（UIは汎用的であるべき）",
      from: {
        path: "^app/_shared/components/ui/",
      },
      to: {
        path: "^app/_shared/features/",
      },
    },

    // ========================================
    // 孤立モジュールの検出（警告）
    // ========================================
    {
      name: "no-orphans",
      severity: "warn",
      comment:
        "どこからも参照されていないモジュールです。不要であれば削除を検討してください",
      from: {
        orphan: true,
        pathNot: [
          // Next.js規約ファイル
          "(page|layout|loading|error|not-found|template|default)\\.tsx$",
          // 設定ファイル
          "\\.config\\.(ts|js|mjs|cjs)$",
          // エントリーポイント
          "^app/(layout|page)\\.tsx$",
          // Convex生成ファイル
          "^convex/_generated/",
          // Convex エントリーポイント
          "^convex/(auth|http|crons)\\.ts$",
          // テストファイル
          "\\.test\\.(ts|tsx)$",
          "__tests__/",
          // 型定義
          "types?\\.ts$",
          // index.ts（Public API）
          "index\\.ts$",
          // instrumentation
          "instrumentation",
          // middleware
          "middleware\\.ts$",
          // convex-test セットアップファイル
          "^convex/test\\.setup\\.ts$",
        ],
      },
      to: {},
    },

    // ========================================
    // deprecated パッケージへの依存警告
    // ========================================
    {
      name: "no-deprecated-core",
      severity: "warn",
      comment: "非推奨のNode.jsコアモジュールへの依存です",
      from: {},
      to: {
        dependencyTypes: ["core"],
        path: "^(punycode|domain|constants|sys|_linklist|_stream_wrap)$",
      },
    },

    // ========================================
    // devDependencies の本番コードでの使用禁止
    // ========================================
    {
      name: "not-to-dev-dep",
      severity: "error",
      comment:
        "本番コードでdevDependenciesに依存してはいけません（テスト/設定ファイルを除く）",
      from: {
        path: "^(app|convex)/",
        pathNot: [
          "\\.test\\.(ts|tsx)$",
          "__tests__/",
          "\\.config\\.(ts|js|mjs|cjs)$",
        ],
      },
      to: {
        dependencyTypes: ["npm-dev"],
        // テスト関連パッケージは除外
        pathNot: ["vitest", "@testing-library", "convex-test"],
      },
    },

    // ========================================
    // _shared外からの_shared内部モジュール直接アクセス禁止
    // ========================================
    {
      name: "no-direct-shared-internal-access",
      severity: "warn",
      comment:
        "_sharedの内部モジュールはindex.ts経由でアクセスすることを推奨します",
      from: {
        path: "^app/\\(private\\)/|^app/\\(public\\)/",
      },
      to: {
        path: "^app/_shared/features/[^/]+/(?!index\\.ts$)[^/]+\\.tsx?$",
        // ただし、以下は直接アクセスを許可
        pathNot: [
          // コンポーネントの直接インポートは許可（現実的な運用）
          "\\.tsx$",
        ],
      },
    },
  ],

  options: {
    doNotFollow: {
      path: [
        "node_modules",
        // Convex生成ファイルは解析対象外
        "convex/_generated",
      ],
    },

    exclude: {
      path: [
        // テストファイルは依存解析から除外
        "\\.test\\.(ts|tsx)$",
        "__tests__/",
        // E2Eテスト
        "^e2e/",
        // Playwright設定
        "playwright\\.config\\.ts$",
        // Vitest設定
        "vitest\\.(config|setup)\\.ts$",
      ],
    },

    includeOnly: {
      path: ["^app/", "^convex/"],
    },

    tsPreCompilationDeps: true,

    tsConfig: {
      fileName: "tsconfig.json",
    },

    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      mainFields: ["module", "main", "types", "typings"],
    },

    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/(@[^/]+/[^/]+|[^/]+)",
      },
      archi: {
        collapsePattern:
          "^(app/_shared/features/[^/]+|app/_shared/components|app/_shared/lib|convex/[^/]+)",
      },
      text: {
        highlightFocused: true,
      },
    },

    cache: {
      strategy: "content",
      folder: "node_modules/.cache/dependency-cruiser",
    },

    progress: {
      type: "performance-log",
    },
  },
};
