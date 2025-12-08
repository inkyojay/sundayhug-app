/**
 * API endpoint to seed initial reference data
 * POST /api/sleep/seed-references
 *
 * This should only be called once to populate the database with initial data.
 */
import type { Route } from "./+types/seed-references";
import {
  hasReferencesData,
  storeReferences,
  INITIAL_REFERENCES,
} from "../lib/rag.server";

export async function action({ request }: Route.ActionArgs) {
  // Only allow POST
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Check if data already exists
    const hasData = await hasReferencesData();
    if (hasData) {
      return Response.json({
        success: true,
        message: "Reference data already exists",
        seeded: false,
      });
    }

    // Store initial references
    await storeReferences(INITIAL_REFERENCES);

    return Response.json({
      success: true,
      message: `Successfully seeded ${INITIAL_REFERENCES.length} references`,
      seeded: true,
      count: INITIAL_REFERENCES.length,
    });
  } catch (error) {
    console.error("Error seeding references:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function loader() {
  // GET request - check status
  try {
    const hasData = await hasReferencesData();
    return Response.json({
      hasData,
      message: hasData
        ? "Reference data exists"
        : "No reference data. POST to this endpoint to seed.",
    });
  } catch (error) {
    return Response.json(
      {
        hasData: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



