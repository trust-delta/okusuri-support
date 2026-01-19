#!/bin/bash
# テストデータ投入スクリプト
#
# 使用例:
#   bash seed-test-data.sh seed              # サンプルデータ投入
#   bash seed-test-data.sh reset             # データリセット
#   bash seed-test-data.sh status            # 状態確認
#   EMAIL=test@example.com bash seed-test-data.sh seed  # メール指定

set -e

EMAIL="${EMAIL:-test@example.com}"
ACTION="${1:-seed}"

echo "========================================"
echo "テストデータ操作: $ACTION"
echo "対象メール: $EMAIL"
echo "========================================"

case "$ACTION" in
  seed)
    echo "サンプルデータを投入中..."
    npx convex run seeding/actions:internal_seedTestData "{\"email\":\"$EMAIL\"}"
    echo ""
    echo "✓ サンプルデータを投入しました"
    ;;

  reset)
    echo "テストデータをリセット中..."
    npx convex run seeding/actions:internal_resetTestData "{\"email\":\"$EMAIL\"}"
    echo ""
    echo "✓ テストデータをリセットしました"
    ;;

  status)
    echo "ユーザー状態を確認中..."
    npx convex run seeding/actions:internal_getTestUserInfo "{\"email\":\"$EMAIL\"}"
    ;;

  *)
    echo "使用方法:"
    echo "  $0 seed    - サンプルデータを投入"
    echo "  $0 reset   - テストデータをリセット"
    echo "  $0 status  - ユーザー状態を確認"
    echo ""
    echo "環境変数:"
    echo "  EMAIL      - 対象のテストメールアドレス (default: test@example.com)"
    exit 1
    ;;
esac
