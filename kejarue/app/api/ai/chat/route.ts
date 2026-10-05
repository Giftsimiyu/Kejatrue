import { NextResponse } from "next/server";
import { createClient } from "@/app/backend/supabase/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type ToolCall = {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function propertyText(p: any) {
  return {
    id: p.id,
    title: p.title,
    city: p.city,
    location: p.location,
    address: p.address,
    property_type: p.property_type,
    listing_type: p.listing_type,
    advertised_rent: p.price,
    true_monthly_cost: p.true_monthly_cost,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    area_sqft: p.area_sqft,
    trust_score: p.trust_score,
    safety_score: p.safety_score,
    water_score: p.water_score,
    network_score: p.network_score,
    area_score: p.area_score,
    verification_status: p.verification_status,
    listing_status: p.listing_status,
    last_confirmed_at: p.last_confirmed_at,
    description: p.description,
    amenities: p.amenities,
    tags: p.tags,
    thumbnail: p.thumbnail,
  };
}

async function getUserContext(supabase: any) {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      authUser: null,
      profile: null,
    };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id,auth_user_id,full_name,email,role")
    .or(`id.eq.${authUser.id},auth_user_id.eq.${authUser.id}`)
    .maybeSingle();

  return {
    authUser,
    profile,
  };
}

async function searchProperties(supabase: any, args: any) {
  const maxBudget =
    Number(args.max_budget) > 0 ? Number(args.max_budget) : null;

  const minBedrooms =
    Number(args.min_bedrooms) > 0 ? Number(args.min_bedrooms) : 0;

  const city = String(args.city ?? "").trim().toLowerCase();
  const location = String(args.location ?? "").trim().toLowerCase();
  const propertyType = String(args.property_type ?? "")
    .trim()
    .toLowerCase();

  const minSafety = Number(args.min_safety) || 0;
  const minTrust = Number(args.min_trust) || 0;

  const requiredAmenities = Array.isArray(args.required_amenities)
    ? args.required_amenities
        .map((x: any) => String(x).trim().toLowerCase())
        .filter(Boolean)
    : [];

  const { data: properties, error } = await supabase
    .from("properties")
    .select(
      `
      id,
      title,
      description,
      property_type,
      listing_type,
      price,
      bedrooms,
      bathrooms,
      area_sqft,
      city,
      location,
      address,
      amenities,
      tags,
      thumbnail,
      featured,
      verification_status,
      trust_score,
      safety_score,
      water_score,
      network_score,
      area_score,
      true_monthly_cost,
      listing_status,
      last_confirmed_at
      `,
    )
    .eq("listing_status", "active")
    .neq("verification_status", "rejected")
    .order("featured", { ascending: false })
    .order("trust_score", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  const ids = (properties ?? []).map((p: any) => p.id);

  const { data: costs } = ids.length
    ? await supabase
        .from("property_costs")
        .select(
          `
          property_id,
          service_charge,
          garbage_fee,
          average_water_cost,
          average_electricity_cost,
          average_internet_cost,
          other_monthly_cost
          `,
        )
        .in("property_id", ids)
    : { data: [] };

  const costMap = new Map(
    (costs ?? []).map((c: any) => [c.property_id, c]),
  );

  const ranked = (properties ?? [])
    .filter((p: any) => {
      if (
        city &&
        !String(p.city ?? "")
          .toLowerCase()
          .includes(city)
      ) {
        return false;
      }

      const searchable = [
        p.location,
        p.address,
        p.city,
        p.title,
        p.description,
        ...(Array.isArray(p.tags) ? p.tags : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (location && !searchable.includes(location)) {
        return false;
      }

      if (
        propertyType &&
        !String(p.property_type ?? "")
          .toLowerCase()
          .includes(propertyType)
      ) {
        return false;
      }

      if (
        minBedrooms &&
        Number(p.bedrooms ?? 0) < minBedrooms
      ) {
        return false;
      }

      if (
        minSafety &&
        Number(p.safety_score ?? 0) < minSafety
      ) {
        return false;
      }

      if (
        minTrust &&
        Number(p.trust_score ?? 0) < minTrust
      ) {
        return false;
      }

      if (requiredAmenities.length) {
        const amenities = (
          Array.isArray(p.amenities) ? p.amenities : []
        ).map((x: any) => String(x).toLowerCase());

        const allPresent = requiredAmenities.every(
          (needed: string) =>
            amenities.some((a: string) =>
              a.includes(needed),
            ),
        );

        if (!allPresent) {
          return false;
        }
      }

      const monthly =
        Number(p.true_monthly_cost ?? 0) > 0
          ? Number(p.true_monthly_cost)
          : Number(p.price ?? 0);

      if (
        maxBudget !== null &&
        monthly > maxBudget
      ) {
        return false;
      }

      return true;
    })
    .map((p: any) => {
      const monthly =
        Number(p.true_monthly_cost ?? 0) > 0
          ? Number(p.true_monthly_cost)
          : Number(p.price ?? 0);

      const budgetFit =
        maxBudget === null
          ? 1
          : Math.max(
              0,
              1 -
                Math.max(0, monthly - maxBudget) /
                  Math.max(maxBudget, 1),
            );

      const safety = Math.max(
        0,
        Math.min(100, Number(p.safety_score ?? 0)),
      );

      const trust = Math.max(
        0,
        Math.min(100, Number(p.trust_score ?? 0)),
      );

      const water = Math.max(
        0,
        Math.min(100, Number(p.water_score ?? 0)),
      );

      const network = Math.max(
        0,
        Math.min(100, Number(p.network_score ?? 0)),
      );

      const area = Math.max(
        0,
        Math.min(100, Number(p.area_score ?? 0)),
      );

      const amenities = (
        Array.isArray(p.amenities) ? p.amenities : []
      ).map((x: any) => String(x).toLowerCase());

      const amenityFit = requiredAmenities.length
        ? requiredAmenities.filter((needed: string) =>
            amenities.some((a: string) =>
              a.includes(needed),
            ),
          ).length / requiredAmenities.length
        : 1;

      const matchScore = Math.round(
        budgetFit * 35 +
          safety * 0.2 +
          trust * 0.2 +
          water * 0.1 +
          network * 0.05 +
          area * 0.05 +
          amenityFit * 5,
      );

      return {
        ...propertyText(p),

        monthly_cost_breakdown:
          costMap.get(p.id) ?? null,

        match_score: matchScore,

        explained_score: {
          budget_fit: Math.round(budgetFit * 100),
          safety,
          trust,
          water,
          network,
          area,
          amenities: Math.round(amenityFit * 100),
        },
      };
    })
    .sort(
      (a: any, b: any) =>
        b.match_score - a.match_score,
    )
    .slice(0, 10);

  return {
    count: ranked.length,

    note:
      "Match score is deterministic ranking from stored KejaTrue data, not a fabricated AI score.",

    properties: ranked,
  };
}

async function getPropertyDetails(
  supabase: any,
  propertyId: string,
) {
  const {
    data: property,
    error,
  } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!property) {
    return {
      found: false,
    };
  }

  const [
    { data: costs },
    { data: verification },
    { data: reviews },
    { data: images },
  ] = await Promise.all([
    supabase
      .from("property_costs")
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle(),

    supabase
      .from("property_verifications")
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle(),

    supabase
      .from("property_reviews")
      .select(
        `
        overall_rating,
        water_rating,
        security_rating,
        network_rating,
        noise_rating,
        landlord_rating,
        review_text,
        is_verified_tenant,
        is_approved,
        created_at
        `,
      )
      .eq("property_id", propertyId)
      .eq("is_approved", true)
      .order("created_at", {
        ascending: false,
      })
      .limit(20),

    supabase
      .from("property_images")
      .select(
        `
        image_url,
        caption,
        is_primary,
        display_order
        `,
      )
      .eq("property_id", propertyId)
      .order("display_order", {
        ascending: true,
      }),
  ]);

  return {
    found: true,

    property: propertyText(property),

    costs: costs ?? null,

    verification:
      verification ?? null,

    reviews: reviews ?? [],

    images: images ?? [],
  };
}

async function compareProperties(
  supabase: any,
  propertyIds: string[],
) {
  if (
    !Array.isArray(propertyIds) ||
    propertyIds.length < 2
  ) {
    return {
      error:
        "Provide at least two property IDs.",
    };
  }

  const {
    data,
    error,
  } = await supabase
    .from("properties")
    .select(
      `
      id,
      title,
      city,
      location,
      property_type,
      price,
      bedrooms,
      bathrooms,
      true_monthly_cost,
      trust_score,
      safety_score,
      water_score,
      network_score,
      area_score,
      verification_status,
      listing_status,
      thumbnail
      `,
    )
    .in("id", propertyIds);

  if (error) {
    throw error;
  }

  return {
    count: data?.length ?? 0,

    properties: (data ?? []).map(
      (p: any) => ({
        ...propertyText(p),

        compared_rank_inputs: {
          advertised_rent: Number(
            p.price ?? 0,
          ),

          true_monthly_cost: Number(
            p.true_monthly_cost ??
              p.price ??
              0,
          ),

          trust_score: Number(
            p.trust_score ?? 0,
          ),

          safety_score: Number(
            p.safety_score ?? 0,
          ),

          water_score: Number(
            p.water_score ?? 0,
          ),

          network_score: Number(
            p.network_score ?? 0,
          ),

          area_score: Number(
            p.area_score ?? 0,
          ),
        },
      }),
    ),
  };
}

async function getAreaIntelligence(
  supabase: any,
  city: string,
  areaName: string,
) {
  let query = supabase
    .from("area_intelligence")
    .select("*")
    .limit(10);

  if (city) {
    query = query.ilike(
      "city",
      `%${city}%`,
    );
  }

  if (areaName) {
    query = query.ilike(
      "area_name",
      `%${areaName}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return {
    count: data?.length ?? 0,
    areas: data ?? [],
  };
}

async function getVisitSlots(
  supabase: any,
  propertyId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("property_visit_slots")
    .select(
      `
      id,
      property_id,
      host_user_id,
      starts_at,
      ends_at,
      is_available,
      created_at
      `,
    )
    .eq("property_id", propertyId)
    .eq("is_available", true)
    .gt(
      "starts_at",
      new Date().toISOString(),
    )
    .order("starts_at", {
      ascending: true,
    })
    .limit(20);

  if (error) {
    throw error;
  }

  return {
    property_id: propertyId,
    slots: data ?? [],
  };
}

async function requestVisit(
  supabase: any,
  slotId: string,
  notes: string | null,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "request_property_visit",
    {
      p_slot_id: slotId,
      p_notes: notes,
    },
  );

  if (error) {
    throw error;
  }

  return {
    success: true,
    request_id: data,
  };
}

async function cancelVisit(
  supabase: any,
  requestId: string,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "cancel_property_visit",
    {
      p_request_id: requestId,
    },
  );

  if (error) {
    throw error;
  }

  return {
    success: Boolean(data),
  };
}

async function getMyVisits(
  supabase: any,
  userId: string,
) {
  const {
    data: visits,
    error,
  } = await supabase
    .from("property_visit_requests")
    .select(
      `
      id,
      property_id,
      slot_id,
      status,
      message,
      created_at,
      updated_at
      `,
    )
    .eq(
      "house_hunter_id",
      userId,
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(30);

  if (error) {
    throw error;
  }

  const propertyIds = [
    ...new Set(
      (visits ?? []).map(
        (v: any) =>
          v.property_id,
      ),
    ),
  ];

  const slotIds = [
    ...new Set(
      (visits ?? []).map(
        (v: any) =>
          v.slot_id,
      ),
    ),
  ];

  const [
    { data: properties },
    { data: slots },
  ] = await Promise.all([
    propertyIds.length
      ? supabase
          .from("properties")
          .select(
            "id,title,location,city,thumbnail",
          )
          .in(
            "id",
            propertyIds,
          )
      : Promise.resolve({
          data: [],
        }),

    slotIds.length
      ? supabase
          .from("property_visit_slots")
          .select(
            "id,starts_at,ends_at",
          )
          .in(
            "id",
            slotIds,
          )
      : Promise.resolve({
          data: [],
        }),
  ]);

  const propertyMap =
    new Map(
      (properties ?? []).map(
        (p: any) => [
          p.id,
          p,
        ],
      ),
    );

  const slotMap =
    new Map(
      (slots ?? []).map(
        (s: any) => [
          s.id,
          s,
        ],
      ),
    );

  return {
    visits: (visits ?? []).map(
      (v: any) => ({
        ...v,

        property:
          propertyMap.get(
            v.property_id,
          ) ?? null,

        slot:
          slotMap.get(
            v.slot_id,
          ) ?? null,
      }),
    ),
  };
}

async function saveProperty(
  supabase: any,
  userId: string,
  propertyId: string,
) {
  const {
    error,
  } = await supabase
    .from("favorites")
    .upsert(
      {
        user_id: userId,
        property_id:
          propertyId,
      },
      {
        onConflict:
          "user_id,property_id",
      },
    );

  if (error) {
    throw error;
  }

  return {
    success: true,
    property_id:
      propertyId,
  };
}

const tools = [
  {
    type: "function",

    function: {
      name: "search_properties",

      description:
        "Search actual active KejaTrue listings and rank them using stored rent, true monthly cost, trust, safety, water, network, area and amenity data.",

      parameters: {
        type: "object",

        properties: {
          max_budget: {
            type: "number",
          },

          min_bedrooms: {
            type: "number",
          },

          city: {
            type: "string",
          },

          location: {
            type: "string",
          },

          property_type: {
            type: "string",
          },

          min_safety: {
            type: "number",
          },

          min_trust: {
            type: "number",
          },

          required_amenities: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      },
    },
  },

  {
    type: "function",

    function: {
      name: "get_property_details",

      description:
        "Get stored property details, costs, verification evidence and approved reviews.",

      parameters: {
        type: "object",

        required: [
          "property_id",
        ],

        properties: {
          property_id: {
            type: "string",
          },
        },
      },
    },
  },

  {
    type: "function",

    function: {
      name: "compare_properties",

      description:
        "Compare actual KejaTrue properties using stored measurable fields.",

      parameters: {
        type: "object",

        required: [
          "property_ids",
        ],

        properties: {
          property_ids: {
            type: "array",

            items: {
              type: "string",
            },
          },
        },
      },
    },
  },

  {
    type: "function",

    function: {
      name: "get_area_intelligence",

      description:
        "Get stored area intelligence for water, security, network, roads, lighting, flood risk, noise and overall score.",

      parameters: {
        type: "object",

        properties: {
          city: {
            type: "string",
          },

          area_name: {
            type: "string",
          },
        },
      },
    },
  },

  {
    type: "function",

    function: {
      name: "get_available_visit_slots",

      description:
        "Get future available viewing slots for a property.",

      parameters: {
        type: "object",

        required: [
          "property_id",
        ],

        properties: {
          property_id: {
            type: "string",
          },
        },
      },
    },
  },

  {
    type: "function",

    function: {
      name: "request_property_visit",

      description:
        "Book an actual property viewing only after the user explicitly selected a specific slot.",

      parameters: {
        type: "object",

        required: [
          "slot_id",
        ],

        properties: {
          slot_id: {
            type: "string",
          },

          notes: {
            type: "string",
          },
        },
      },
    },
  },

  {
    type: "function",

    function: {
      name: "cancel_property_visit",

      description:
        "Cancel one active viewing request belonging to the current user.",

      parameters: {
        type: "object",

        required: [
          "request_id",
        ],

        properties: {
          request_id: {
            type: "string",
          },
        },
      },
    },
  },

  {
    type: "function",

    function: {
      name: "get_my_visits",

      description:
        "Get the current user's viewing requests.",

      parameters: {
        type: "object",
        properties: {},
      },
    },
  },

  {
    type: "function",

    function: {
      name: "save_property",

      description:
        "Save a property to the current user's favorites.",

      parameters: {
        type: "object",

        required: [
          "property_id",
        ],

        properties: {
          property_id: {
            type: "string",
          },
        },
      },
    },
  },
];

export async function POST(
  request: Request,
) {
  try {
    const apiKey =
      process.env.GROQ_API_KEY;

    if (!apiKey) {
      return json(
        {
          error:
            "The assistant is temporarily unavailable. Please try again later.",
        },
        500,
      );
    }

    const supabase =
      await createClient();

    const {
      authUser,
      profile,
    } =
      await getUserContext(
        supabase,
      );

    if (
      !authUser ||
      !profile
    ) {
      return json(
        {
          error:
            "Please sign in to use KejaTrue AI.",
        },
        401,
      );
    }

    const body =
      await request.json();

    const incomingMessages =
      Array.isArray(
        body.messages,
      )
        ? body.messages
        : [];

    const messages: any[] = [
      {
        role: "system",

        content: `You are KejaTrue AI, a real rental-intelligence and house-hunting agent for Kenya.

You are connected to live KejaTrue database tools. You are NOT a generic FAQ chatbot.

Rules:

- Never invent properties, prices, scores, reviews, locations, costs or visit slots.
- Use tools whenever the user asks about actual listings, affordability, areas, comparisons or visits.
- Explain recommendations from actual database evidence.
- Prefer true_monthly_cost over advertised rent when discussing affordability.
- Match scores are deterministic rankings from stored data, not AI facts.
- For viewings, retrieve available slots first and ask the user to choose a specific slot.
- Never book an unspecified time on the user's behalf.
- Only cancel a visit when the user clearly requests it.
- Do not call an unverified property fraudulent. Describe missing verification as a confidence/risk signal.
- Ask for missing budget, area, bedrooms or priorities when needed.
- Keep answers concise, practical and Kenya-aware.

Current user:
${profile.full_name ?? "User"}

Role:
${profile.role}`,
      },

      ...incomingMessages,
    ];

    for (
      let round = 0;
      round < 6;
      round++
    ) {
      const response =
        await fetch(
          GROQ_URL,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${apiKey}`,
            },

            body: JSON.stringify({
              model:
                process.env
                  .GROQ_MODEL ||
                  "openai/gpt-oss-20b",

              temperature:
                0.2,

              messages,

              tools,

              tool_choice:
                "auto",
            }),
          },
        );

      if (!response.ok) {
        const details =
          await response.text();

        console.error("Groq chat completion failed:", {
          status: response.status,
          details,
        });

        return json(
          {
            error:
              "I couldn't complete that just now. Please try again shortly.",
          },
          500,
        );
      }

      const completion =
        await response.json();

      const assistantMessage =
        completion
          .choices?.[0]
          ?.message;

      if (
        !assistantMessage
      ) {
        return json(
          {
            error:
              "I couldn't respond just now. Please try again shortly.",
          },
          500,
        );
      }

      const toolCalls: ToolCall[] =
        assistantMessage.tool_calls ??
        [];

      messages.push(
        assistantMessage,
      );

      if (
        !toolCalls.length
      ) {
        const answer =
          assistantMessage.content ||
          "I could not complete that request.";

        try {
          await supabase
            .from(
              "chat_history",
            )
            .insert({
              user_id:
                profile.id,

              message:
                incomingMessages[
                  incomingMessages.length -
                    1
                ]?.content ?? "",

              response:
                answer,
            });
        } catch {}

        return json({
          answer,
        });
      }

      for (
        const call of toolCalls
      ) {
        let result: unknown;

        try {
          const args =
            JSON.parse(
              call.function
                .arguments ||
                "{}",
            );

          switch (
            call.function
              .name
          ) {
            case "search_properties":
              result =
                await searchProperties(
                  supabase,
                  args,
                );
              break;

            case "get_property_details":
              result =
                await getPropertyDetails(
                  supabase,
                  args.property_id,
                );
              break;

            case "compare_properties":
              result =
                await compareProperties(
                  supabase,
                  args.property_ids,
                );
              break;

            case "get_area_intelligence":
              result =
                await getAreaIntelligence(
                  supabase,
                  args.city ??
                    "",
                  args.area_name ??
                    "",
                );
              break;

            case "get_available_visit_slots":
              result =
                await getVisitSlots(
                  supabase,
                  args.property_id,
                );
              break;

            case "request_property_visit":
              result =
                await requestVisit(
                  supabase,
                  args.slot_id,
                  args.notes ??
                    null,
                );
              break;

            case "cancel_property_visit":
              result =
                await cancelVisit(
                  supabase,
                  args.request_id,
                );
              break;

            case "get_my_visits":
              result =
                await getMyVisits(
                  supabase,
                  profile.id,
                );
              break;

            case "save_property":
              result =
                await saveProperty(
                  supabase,
                  profile.id,
                  args.property_id,
                );
              break;

            default:
              result = {
                error:
                  "Unknown tool.",
              };
          }
        } catch (
          error: any
        ) {
          result = {
            error:
              error?.message ||
              "Tool execution failed.",
          };
        }

        messages.push({
          role: "tool",

          tool_call_id:
            call.id,

          content:
            JSON.stringify(
              result,
            ),
        });
      }
    }

    return json(
      {
        error:
          "The assistant reached its tool-call limit.",
      },
      500,
    );
  } catch (
    error: any
  ) {
    console.error("AI chat request failed:", error);

    return json(
      {
        error:
          "I couldn't process that just now. Please try again shortly.",
      },
      500,
    );
  }
}