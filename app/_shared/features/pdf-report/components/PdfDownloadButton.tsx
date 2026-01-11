"use client";

import { pdf } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  MedicationReportDocument,
  type ReportData,
} from "./MedicationReportDocument";

interface PdfDownloadButtonProps {
  data: ReportData;
  disabled?: boolean;
}

export function PdfDownloadButton({ data, disabled }: PdfDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (!data || isGenerating) return;

    setIsGenerating(true);

    try {
      // PDFを生成
      const blob = await pdf(<MedicationReportDocument data={data} />).toBlob();

      // ファイル名を生成（日本語を含むためエンコード）
      const fileName = `服薬レポート_${data.groupName}_${data.period.startDate}_${data.period.endDate}.pdf`;

      // ダウンロードリンクを作成
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDFをダウンロードしました");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("PDFの生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={disabled || isGenerating || !data}
      variant="outline"
      className="gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          PDF生成中...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          PDFをダウンロード
        </>
      )}
    </Button>
  );
}
