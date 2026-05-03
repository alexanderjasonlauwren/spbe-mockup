import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSAList, uploadSA, convertSAToPlan } from "../api/saApi";
import type { SAFilterParams, UploadSAPayload } from "../types";

export function useScheduleAgreement() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<SAFilterParams>({});

  const saList = useQuery({
    queryKey: ["sa-list", filters],
    queryFn: () => getSAList(filters),
  });

  const uploadMutation = useMutation({
    mutationFn: (payload: UploadSAPayload) => uploadSA(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-list"] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (saId: string) => convertSAToPlan(saId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-list"] });
    },
  });

  return {
    saList: saList.data ?? [],
    isLoading: saList.isLoading,
    filters,
    setFilters,
    uploadMutation,
    convertMutation,
  };
}
