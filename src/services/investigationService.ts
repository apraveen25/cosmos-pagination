import { SqlQuerySpec } from "@azure/cosmos";
import { getContainer } from "./cosmosClient";
import { Investigation, InvestigationsResponse } from "../models/investigation";

const MAX_PAGE_SIZE = 100;

export interface GetInvestigationsOptions {
  /** When undefined, all documents are returned in a single response (no pagination). */
  pageSize?: number;
  continuationToken?: string;
  status?: string;
}

export async function getInvestigations(
  options: GetInvestigationsOptions
): Promise<InvestigationsResponse<Investigation>> {
  const container = getContainer();
  const dataQuery = buildDataQuery(options.status);

  if (options.pageSize === undefined) {
    // Fetch-all mode: totalCount === data.length, no separate count query needed.
    const { resources } = await container.items
      .query<Investigation>(dataQuery)
      .fetchAll();

    return { data: resources, count: resources.length, totalCount: resources.length };
  }

  // Paginated mode: run data query and count query in parallel to avoid adding latency.
  // COUNT(1) is a full-partition scan — both queries run concurrently so total wall time
  // is max(data_query, count_query) rather than their sum.
  const pageSize = Math.min(options.pageSize, MAX_PAGE_SIZE);

  const [pageResult, totalCount] = await Promise.all([
    container.items
      .query<Investigation>(dataQuery, {
        maxItemCount: pageSize,
        continuationToken: options.continuationToken,
      })
      .fetchNext(),
    fetchTotalCount(options.status),
  ]);

  return {
    data: pageResult.resources,
    count: pageResult.resources.length,
    totalCount,
    ...(pageResult.continuationToken
      ? { nextContinuationToken: pageResult.continuationToken }
      : {}),
  };
}

async function fetchTotalCount(status?: string): Promise<number> {
  const container = getContainer();

  const query: SqlQuerySpec = status
    ? {
        query: "SELECT VALUE COUNT(1) FROM c WHERE c.status = @status",
        parameters: [{ name: "@status", value: status }],
      }
    : { query: "SELECT VALUE COUNT(1) FROM c", parameters: [] };

  const { resources } = await container.items
    .query<number>(query)
    .fetchAll();

  return resources[0] ?? 0;
}

function buildDataQuery(status?: string): SqlQuerySpec {
  // Project only needed fields — reduces RU cost when Investigation has many properties.
  const SELECT = `
    SELECT
      c.id,
      c.title,
      c.status,
      c.severity,
      c.assignedTo,
      c.createdAt,
      c.updatedAt,
      c.description
    FROM c
  `;

  if (status) {
    return {
      query: `${SELECT} WHERE c.status = @status ORDER BY c.createdAt DESC`,
      parameters: [{ name: "@status", value: status }],
    };
  }

  return {
    query: `${SELECT} ORDER BY c.createdAt DESC`,
    parameters: [],
  };
}
