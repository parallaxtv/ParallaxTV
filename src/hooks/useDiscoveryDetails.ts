import { useState, useEffect } from "react";
import { DiscoveryItem, DiscoveryDetail } from "../types/discovery";
import { fetchDiscoveryDetails } from "../services/discovery/discoveryService";

export function useDiscoveryDetails(type: "anime" | "kdrama" | "movies" | "seasonal", selected: DiscoveryItem | null) {
  const [detailData, setDetailData] = useState<DiscoveryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);

  useEffect(() => {
    setTrailerKey(null);
    
    if (!selected) { 
      setDetailData(null); 
      return; 
    }

    setDetailLoading(true);
    setDetailData(null);

    fetchDiscoveryDetails(type, selected).then(({ detail, trailerKey }) => {
      if (detail) setDetailData(detail);
      if (trailerKey) setTrailerKey(trailerKey);
    }).finally(() => {
      setDetailLoading(false);
    });
  }, [selected?.id, selected, type]);

  return { detailData, detailLoading, trailerKey };
}