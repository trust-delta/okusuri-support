import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-lg">💊</span>
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                おくすりサポート
              </h1>
            </div>
            <Button asChild>
              <Link href="/login">ログイン</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main>
        {/* ヒーローセクション */}
        <section className="relative overflow-hidden">
          {/* 背景のグラデーション */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 py-20 relative">
            <div className="text-center space-y-6 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                服薬管理をもっとシンプルに
              </div>

              <h2 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
                服薬管理を簡単に。
                <br />
                <span className="text-primary">家族みんなで見守りを</span>
                サポート。
              </h2>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                お薬の飲み忘れを防ぎ、家族で服薬状況を共有できるアプリです。
                <br />
                シンプルな操作で、毎日の健康管理をサポートします。
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/login">無料で始める</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Link href="#features">機能を見る</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 機能紹介 */}
        <section id="features" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                Features
              </h3>
              <h2 className="text-3xl font-bold text-foreground">
                シンプルで使いやすい機能
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card className="text-center">
                <CardContent className="pt-8 pb-6 space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
                    <span className="text-3xl">📝</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    簡単記録
                  </h3>
                  <p className="text-muted-foreground">
                    お薬を飲んだらワンタップで記録。シンプルで使いやすいインターフェース。
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-8 pb-6 space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
                    <span className="text-3xl">👨‍👩‍👧‍👦</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    家族で共有
                  </h3>
                  <p className="text-muted-foreground">
                    離れて暮らす家族の服薬状況も確認できます。安心の見守り機能。
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-8 pb-6 space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
                    <span className="text-3xl">📊</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    履歴管理
                  </h3>
                  <p className="text-muted-foreground">
                    過去の服薬記録を一覧で確認。健康管理に役立つデータを蓄積。
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA セクション */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <Card className="max-w-3xl mx-auto overflow-hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
                <CardContent className="relative py-12 text-center space-y-6">
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                    今日から服薬管理を始めましょう
                  </h2>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    登録は無料です。家族を招待して、一緒に健康を見守りましょう。
                  </p>
                  <Button asChild size="lg">
                    <Link href="/login">無料で始める</Link>
                  </Button>
                </CardContent>
              </div>
            </Card>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="border-t border-border bg-card/50 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 おくすりサポート. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
