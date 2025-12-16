#!/usr/bin/env python3
"""
バックエンドセキュリティ静的解析ツール

Convex、Next.js Server Actions、Supabase Edge Functions、
Firebase Cloud Functions の一般的なセキュリティ問題を検出します。

使用方法:
    python analyze.py ./convex           # Convex 関数を解析
    python analyze.py ./app --nextjs     # Next.js Server Actions を解析
    python analyze.py ./supabase         # Supabase Edge Functions を解析
    python analyze.py ./functions        # Firebase Cloud Functions を解析
"""

import os
import re
import sys
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Generator


class Severity(Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@dataclass
class Issue:
    severity: Severity
    file: str
    line: int
    message: str
    code: str


def find_files(directory: str, extensions: tuple = (".ts", ".tsx", ".js")) -> Generator[Path, None, None]:
    """ディレクトリ内のすべての TypeScript/JavaScript ファイルを検索"""
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(extensions):
                yield Path(root) / file


def analyze_convex(content: str, filepath: str) -> list[Issue]:
    """Convex 関数のセキュリティ問題を解析"""
    issues = []
    lines = content.split("\n")

    # 公開関数（query, mutation, action）を検索
    public_func_pattern = re.compile(
        r'export\s+const\s+(\w+)\s*=\s*(query|mutation|action)\s*\('
    )

    # 認証チェックパターン
    auth_patterns = [
        r'getAuthUserId',
        r'requireAuth',
        r'ctx\.auth',
        r'getUserIdentity',
        r'auth\.getUserIdentity',
    ]

    in_function = False
    function_name = ""
    function_start = 0
    function_content = ""
    brace_count = 0

    for i, line in enumerate(lines, 1):
        match = public_func_pattern.search(line)
        if match:
            in_function = True
            function_name = match.group(1)
            function_start = i
            function_content = line
            brace_count = line.count('{') - line.count('}')
            continue

        if in_function:
            function_content += "\n" + line
            brace_count += line.count('{') - line.count('}')

            if brace_count <= 0:
                # 関数終了、認証をチェック
                has_auth = any(
                    re.search(pattern, function_content)
                    for pattern in auth_patterns
                )

                if not has_auth:
                    issues.append(Issue(
                        severity=Severity.HIGH,
                        file=filepath,
                        line=function_start,
                        message=f"公開関数 '{function_name}' に認証チェックがありません",
                        code=f"export const {function_name} = ..."
                    ))

                in_function = False
                function_content = ""

    # 内部関数であるべき機密操作をチェック
    sensitive_patterns = [
        (r'credits?\s*[+\-*]=', "クレジット操作は internalMutation を使用すべき"),
        (r'role\s*=\s*["\']admin', "ロール変更は internalMutation を使用すべき"),
        (r'password', "パスワード操作は internalMutation を使用すべき"),
        (r'balance\s*[+\-*]=', "残高変更は internalMutation を使用すべき"),
    ]

    for pattern, message in sensitive_patterns:
        for i, line in enumerate(lines, 1):
            if re.search(pattern, line, re.IGNORECASE):
                # これが公開関数内かチェック
                if 'internalMutation' not in content[:content.find(line)] or \
                   'mutation(' in content[:content.find(line)]:
                    issues.append(Issue(
                        severity=Severity.MEDIUM,
                        file=filepath,
                        line=i,
                        message=message,
                        code=line.strip()[:80]
                    ))

    return issues


def analyze_nextjs(content: str, filepath: str) -> list[Issue]:
    """Next.js Server Actions のセキュリティ問題を解析"""
    issues = []
    lines = content.split("\n")

    if '"use server"' not in content and "'use server'" not in content:
        return issues  # Server Action ファイルではない

    # エクスポートされた async 関数を検索
    func_pattern = re.compile(r'export\s+async\s+function\s+(\w+)')

    # 認証チェックパターン
    auth_patterns = [
        r'getSession',
        r'getServerSession',
        r'requireAuth',
        r'verifySession',
        r'auth\(\)',
        r'currentUser',
    ]

    # 検証パターン
    validation_patterns = [
        r'\.parse\(',
        r'\.safeParse\(',
        r'z\.',
        r'yup\.',
        r'joi\.',
    ]

    for i, line in enumerate(lines, 1):
        match = func_pattern.search(line)
        if match:
            function_name = match.group(1)

            # 関数本体を取得（大まかな近似）
            func_start = content.find(line)
            func_end = content.find('\nexport', func_start + 1)
            if func_end == -1:
                func_end = len(content)
            func_body = content[func_start:func_end]

            # 認証をチェック
            has_auth = any(
                re.search(pattern, func_body)
                for pattern in auth_patterns
            )

            if not has_auth:
                issues.append(Issue(
                    severity=Severity.HIGH,
                    file=filepath,
                    line=i,
                    message=f"Server Action '{function_name}' に認証チェックがありません",
                    code=f"export async function {function_name}(...)"
                ))

            # 検証をチェック
            has_validation = any(
                re.search(pattern, func_body)
                for pattern in validation_patterns
            )

            # 関数にパラメータがあるかチェック（検証が必要）
            if re.search(rf'{function_name}\s*\([^)]+\)', func_body):
                if not has_validation:
                    issues.append(Issue(
                        severity=Severity.MEDIUM,
                        file=filepath,
                        line=i,
                        message=f"Server Action '{function_name}' に入力検証がない可能性があります",
                        code=f"export async function {function_name}(...)"
                    ))

    # 関数パラメータでの userId をチェック
    user_id_param = re.compile(r'function\s+\w+\s*\([^)]*userId[^)]*\)')
    for i, line in enumerate(lines, 1):
        if user_id_param.search(line):
            issues.append(Issue(
                severity=Severity.HIGH,
                file=filepath,
                line=i,
                message="ユーザー ID は関数引数ではなくセッションから取得すべき（IDOR リスク）",
                code=line.strip()[:80]
            ))

    return issues


def analyze_supabase(content: str, filepath: str) -> list[Issue]:
    """Supabase Edge Functions のセキュリティ問題を解析"""
    issues = []
    lines = content.split("\n")

    # サービスロールキーの使用をチェック
    if 'SERVICE_ROLE' in content or 'service_role' in content:
        for i, line in enumerate(lines, 1):
            if 'SERVICE_ROLE' in line or 'service_role' in line:
                issues.append(Issue(
                    severity=Severity.HIGH,
                    file=filepath,
                    line=i,
                    message="サービスロールキーは RLS をバイパス - 意図的か確認してください",
                    code=line.strip()[:80]
                ))

    # serve() 関数での JWT 検証をチェック
    if 'serve(' in content:
        auth_patterns = [
            r'getUser',
            r'verifyIdToken',
            r'Authorization',
            r'Bearer',
        ]

        has_auth = any(
            re.search(pattern, content)
            for pattern in auth_patterns
        )

        if not has_auth:
            issues.append(Issue(
                severity=Severity.HIGH,
                file=filepath,
                line=1,
                message="Edge Function に JWT 検証がない可能性があります",
                code="serve(async (req) => { ... })"
            ))

    return issues


def analyze_firebase(content: str, filepath: str) -> list[Issue]:
    """Firebase Cloud Functions のセキュリティ問題を解析"""
    issues = []
    lines = content.split("\n")

    # 認証なしの onRequest をチェック
    if 'onRequest' in content:
        auth_patterns = [
            r'verifyIdToken',
            r'Authorization',
            r'Bearer',
        ]

        has_auth = any(
            re.search(pattern, content)
            for pattern in auth_patterns
        )

        if not has_auth:
            for i, line in enumerate(lines, 1):
                if 'onRequest' in line:
                    issues.append(Issue(
                        severity=Severity.HIGH,
                        file=filepath,
                        line=i,
                        message="HTTP Function (onRequest) は ID トークンを手動で検証すべき。代わりに onCall の使用を検討。",
                        code=line.strip()[:80]
                    ))

    # 認証チェックなしの onCall をチェック
    oncall_pattern = re.compile(r'onCall\s*\(\s*async\s*\([^)]*\)\s*=>\s*{')
    for i, line in enumerate(lines, 1):
        if 'onCall' in line:
            # 関数本体を検索
            func_start = content.find('onCall', content.find(line))
            func_body = content[func_start:func_start + 500]  # 大まか

            if 'context.auth' not in func_body and 'request.auth' not in func_body:
                issues.append(Issue(
                    severity=Severity.HIGH,
                    file=filepath,
                    line=i,
                    message="Callable function は context.auth/request.auth をチェックすべき",
                    code=line.strip()[:80]
                ))

    return issues


def detect_platform(directory: str) -> str:
    """ディレクトリの内容からプラットフォームを検出"""
    path = Path(directory)

    if (path / "_generated").exists() or any(
        "convex" in str(f).lower() for f in path.rglob("*.ts")
    ):
        return "convex"

    if any("use server" in f.read_text() for f in path.rglob("*.ts") if f.is_file()):
        return "nextjs"

    if any("Deno" in f.read_text() for f in path.rglob("*.ts") if f.is_file()):
        return "supabase"

    if any("firebase-functions" in f.read_text() for f in path.rglob("*.ts") if f.is_file()):
        return "firebase"

    return "unknown"


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    directory = sys.argv[1]
    platform = sys.argv[2].replace("--", "") if len(sys.argv) > 2 else None

    if not Path(directory).exists():
        print(f"エラー: ディレクトリ '{directory}' が見つかりません")
        sys.exit(1)

    if not platform:
        platform = detect_platform(directory)
        print(f"検出されたプラットフォーム: {platform}")

    analyzers = {
        "convex": analyze_convex,
        "nextjs": analyze_nextjs,
        "supabase": analyze_supabase,
        "firebase": analyze_firebase,
    }

    analyzer = analyzers.get(platform)
    if not analyzer:
        print(f"不明なプラットフォーム: {platform}")
        print(f"対応: {', '.join(analyzers.keys())}")
        sys.exit(1)

    all_issues: list[Issue] = []

    for filepath in find_files(directory):
        try:
            content = filepath.read_text()
            issues = analyzer(content, str(filepath))
            all_issues.extend(issues)
        except Exception as e:
            print(f"{filepath} の解析中にエラー: {e}")

    # 重大度でソート
    all_issues.sort(key=lambda x: (
        {"HIGH": 0, "MEDIUM": 1, "LOW": 2}[x.severity.value],
        x.file,
        x.line
    ))

    # 結果を表示
    if not all_issues:
        print("セキュリティ問題は検出されませんでした")
        sys.exit(0)

    print(f"\n{len(all_issues)} 件の潜在的なセキュリティ問題を検出:\n")

    for issue in all_issues:
        severity_emoji = {
            Severity.HIGH: "HIGH",
            Severity.MEDIUM: "MEDIUM",
            Severity.LOW: "LOW"
        }[issue.severity]

        print(f"[{severity_emoji}] {issue.file}:{issue.line}")
        print(f"   {issue.message}")
        print(f"   コード: {issue.code}")
        print()

    # 高重大度の問題がある場合はエラーコードで終了
    high_count = sum(1 for i in all_issues if i.severity == Severity.HIGH)
    if high_count > 0:
        print(f"{high_count} 件の HIGH 重大度の問題に即座の対応が必要です")
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
