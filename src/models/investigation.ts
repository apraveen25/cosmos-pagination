export interface Investigation {
  id: string;
  title: string;
  status: "open" | "in-progress" | "closed";
  severity: "low" | "medium" | "high" | "critical";
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  // ... additional domain properties
}

export interface InvestigationsResponse<T> {
  data: T[];
  /** Number of documents in this response. */
  count: number;
  /** Total documents matching the query — use this to compute page count in the UI. */
  totalCount: number;
  /** Present only when paginated. Pass as `continuationToken` on the next request to fetch the next page. Absent on the last page or when fetching all. */
  nextContinuationToken?: string;
}
