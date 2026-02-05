/**
 * Warranty Detail State Management Hook
 */
import { useState, useEffect } from "react";
import { useFetcher, useRevalidator } from "react-router";

export function useWarrantyDetail() {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([]);

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetcherData = fetcher.data as { success: boolean; searchResults?: Record<string, unknown>[] } | undefined;
  const isSubmitting = fetcher.state !== "idle";

  // Update state when fetcher completes
  useEffect(() => {
    if (fetcher.state === "idle" && fetcherData?.success) {
      if (fetcherData.searchResults) {
        setSearchResults(fetcherData.searchResults);
      } else {
        revalidator.revalidate();
        setShowSearchDialog(false);
        setSearchQuery("");
        setSearchResults([]);
        setShowRejectDialog(false);
        setRejectionReason("");
      }
    }
  }, [fetcher.state, fetcherData, revalidator]);

  const handleSearch = () => {
    if (searchQuery.length < 3) return;
    fetcher.submit(
      { action: "searchOrders", searchQuery },
      { method: "POST" }
    );
  };

  const handleLinkOrder = (orderId: string) => {
    if (confirm("이 주문을 보증서에 연결하시겠습니까?")) {
      fetcher.submit(
        { action: "linkOrder", orderId },
        { method: "POST" }
      );
    }
  };

  const handleUnlinkOrder = () => {
    if (confirm("주문 연결을 해제하시겠습니까?")) {
      fetcher.submit(
        { action: "unlinkOrder" },
        { method: "POST" }
      );
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert("거절 사유를 입력해주세요.");
      return;
    }

    fetcher.submit(
      { action: "reject", reason: rejectionReason },
      { method: "POST" }
    );
  };

  const closeSearchDialog = () => {
    setShowSearchDialog(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const closeRejectDialog = () => {
    setShowRejectDialog(false);
    setRejectionReason("");
  };

  return {
    fetcher,
    fetcherData,
    isSubmitting,

    // Search
    showSearchDialog,
    setShowSearchDialog,
    searchQuery,
    setSearchQuery,
    searchResults,
    handleSearch,
    handleLinkOrder,
    handleUnlinkOrder,
    closeSearchDialog,

    // Reject
    showRejectDialog,
    setShowRejectDialog,
    rejectionReason,
    setRejectionReason,
    handleReject,
    closeRejectDialog,
  };
}
