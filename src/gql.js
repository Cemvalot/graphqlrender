import { getToken, logout } from "./auth.js";

// Use proxy in development, or if VITE_PROXY_URL is set
// Otherwise try direct URL (may fail due to CORS)
const getGraphQLUrl = () => {
  if (import.meta.env.DEV) {
    return "/api/graphql-engine/v1/graphql";
  }
  const proxyUrl = import.meta.env.VITE_PROXY_URL;
  if (proxyUrl) {
    return `${proxyUrl}/api/graphql-engine/v1/graphql`;
  }
  return "https://platform.zone01.gr/api/graphql-engine/v1/graphql";
};
const GRAPHQL_URL = getGraphQLUrl();

/**
 * Generic GraphQL request helper.
 * Automatically attaches Bearer token and handles 401/log-out.
 */
export async function gqlRequest(query, variables = {}) {
  const token = getToken();
  if (!token) {
    logout();
    return;
  }

  const requestBody = {
    query,
    variables: variables || {}
  };

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(requestBody),
    mode: "cors",
    credentials: "omit"
  });

  if (response.status === 401 || response.status === 403) {
    logout();
    return;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (e) {
    console.error("Failed to parse GraphQL response:", e);
    throw new Error("Invalid JSON response from GraphQL endpoint.");
  }

  // Log full response for debugging
  if (payload.errors) {
    console.error("GraphQL errors:", payload.errors);
    console.error("Query sent:", query.substring(0, 200) + "...");
  }

  if (payload.errors && payload.errors.length > 0) {
    const errorDetails = payload.errors.map((e) => {
      return `${e.message}${e.extensions ? ` (${JSON.stringify(e.extensions)})` : ""}`;
    }).join(", ");
    throw new Error(errorDetails || "GraphQL error.");
  }

  if (!payload.data) {
    throw new Error("No data returned from GraphQL query.");
  }

  return payload.data;
}

// Zone01 uses table-based GraphQL queries (Hasura-style)
// Main profile query demonstrating: normal query, nested query, and queries with arguments
// The 'user' query automatically returns the authenticated user based on Bearer token
export const PROFILE_QUERY = `query ProfileData {
  user {
    lastName
    firstName
    totalXP: transactions_aggregate(
      where: {type: {_eq: "xp"}, event: {path: {_ilike: "/athens/div-01%"}}}
      order_by: {id: asc}
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
    events(where: {event: {path: {_eq: "/athens/div-01"}}}) {
      level
    }
    xp_project: transactions(
      where: {type: {_eq: "xp"}, event: {path: {_ilike: "/athens/div-01%"}}, object: {type: {_eq: "project"}}}
      order_by: {createdAt: desc}
    ) {
      id
      amount
      createdAt
      object {
        id
        name
        type
      }
    }
    audit_down: transactions_aggregate(
      where: {type: {_eq: "down"}, event: {path: {_ilike: "/athens/div-01%"}}}
      order_by: {id: asc}
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
    audit_up: transactions_aggregate(
      where: {type: {_eq: "up"}, event: {path: {_ilike: "/athens/div-01%"}}}
      order_by: {id: asc}
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
    skills: transactions(
      order_by: {type: asc, amount: desc}
      distinct_on: [type]
      where: {eventId: {_eq: 200}, _and: {type: {_like: "skill_%"}}}
    ) {
      type
      amount
    }
  }
}`;

// Arguments + variables example: Query single object by id
// Zone01 uses table-based queries, try both singular and nested approaches
export const ONE_OBJECT_QUERY = `query OneObject($id: Int!) {
  object(where: { id: { _eq: $id } }) {
    id
    name
    type
    createdAt
  }
}`;

// Alternative: Query objects (plural) which might be the correct table name
export const ONE_OBJECT_QUERY_ALT = `query OneObject($id: Int!) {
  objects(where: { id: { _eq: $id } }) {
    id
    name
    type
    createdAt
  }
}`;

// Alternative 2: Query object through transactions (we know transactions work)
export const ONE_OBJECT_VIA_TRANSACTION = `query OneObjectViaTransaction($objectId: Int!) {
  transactions(
    where: { objectId: { _eq: $objectId } }
    limit: 1
  ) {
    object {
      id
      name
      type
      createdAt
    }
  }
}`;


