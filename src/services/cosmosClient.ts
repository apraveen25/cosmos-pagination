import { CosmosClient, Container } from "@azure/cosmos";

let _container: Container | undefined;

/**
 * Returns a singleton Container instance.
 * CosmosClient is expensive to instantiate — reuse it across warm invocations.
 */
export function getContainer(): Container {
  if (_container) return _container;

  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseId = process.env.COSMOS_DATABASE_ID;
  const containerId = process.env.COSMOS_CONTAINER_ID;

  if (!endpoint || !key || !databaseId || !containerId) {
    throw new Error(
      "Missing required Cosmos DB environment variables: COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE_ID, COSMOS_CONTAINER_ID"
    );
  }

  const client = new CosmosClient({ endpoint, key });
  _container = client.database(databaseId).container(containerId);
  return _container;
}
