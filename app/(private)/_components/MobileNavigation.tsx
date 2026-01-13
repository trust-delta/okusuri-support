"use client";

import { useState } from "react";
import { BottomNavigation } from "./BottomNavigation";
import { MobileMenu } from "./MobileMenu";

/**
 * モバイルナビゲーション（ボトムナビ + サイドメニュー）
 * ボトムナビとサイドメニューの状態を管理
 */
export function MobileNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <BottomNavigation onMenuClick={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
