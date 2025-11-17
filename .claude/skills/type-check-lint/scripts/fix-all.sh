#!/bin/bash
# すべての自動修正をまとめて実行
set -e

echo "📝 コードフォーマット実行中..."
npx biome format --write .

echo ""
echo "🔧 Lint自動修正実行中..."
npm run lint -- --fix

echo ""
echo "✅ 型チェック実行中..."
npm run type-check

echo ""
echo "✨ すべての修正が完了しました"
