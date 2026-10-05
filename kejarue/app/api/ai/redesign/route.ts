import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../backend/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const STAGING_STYLES: Record<string, string> = {
  modern: `
    Modern contemporary interior design.
    Clean lines, elegant neutral furniture, subtle decorative elements,
    warm layered lighting, tasteful artwork, contemporary textures,
    uncluttered composition and realistic proportions.
  `,

  minimalist: `
    Minimalist interior design.
    Simple high-quality furniture, clean open spaces, neutral tones,
    very limited decoration, natural materials, soft lighting,
    uncluttered and sophisticated.
  `,

  scandinavian: `
    Scandinavian interior design.
    Light wood, soft neutral colors, simple comfortable furniture,
    natural textures, plants, cozy textiles, bright airy atmosphere,
    functional and elegant styling.
  `,

  bohemian: `
    Modern bohemian interior design.
    Layered textiles, tasteful plants, natural materials,
    warm earthy colors, artistic decor, comfortable furniture,
    sophisticated but relaxed styling.
  `,

  luxury: `
    Contemporary luxury interior design.
    Elegant premium-looking furniture, sophisticated textures,
    tasteful statement lighting, refined decor, neutral rich colors,
    polished and high-end appearance without looking excessive.
  `,

  "warm-cozy": `
    Warm cozy interior design.
    Comfortable furniture, warm lighting, soft textiles,
    natural materials, tasteful decor, plants and a welcoming atmosphere.
    Make the room feel comfortable and lived-in while remaining stylish.
  `,

  contemporary: `
    Contemporary interior design.
    Current stylish furniture, balanced neutral colors,
    subtle statement pieces, clean architecture,
    realistic lighting and sophisticated modern decor.
  `,

  industrial: `
    Refined industrial interior design.
    Modern furniture, subtle metal elements, wood textures,
    neutral tones, tasteful exposed-material styling,
    warm lighting and a sophisticated urban atmosphere.
  `,
};

const REPLICATE_MODEL_URL =
  "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions";

type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string | null;
  error: string | null;
};

function getStylePrompt(style: string) {
  return STAGING_STYLES[style] ?? STAGING_STYLES.modern;
}

async function generateStagedImage(
  apiToken: string,
  imageUrl: string,
  prompt: string,
) {
  const signal = AbortSignal.timeout(105_000);
  const headers = {
    Authorization: `Token ${apiToken}`,
    "Content-Type": "application/json",
  };

  let response = await fetch(REPLICATE_MODEL_URL, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      input: {
        prompt,
        input_image: imageUrl,
        aspect_ratio: "match_input_image",
        output_format: "png",
        safety_tolerance: 2,
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Replicate API error (${response.status}): ${await response.text()}`,
    );
  }

  let prediction = (await response.json()) as ReplicatePrediction;

  if (!prediction.id) {
    throw new Error("Replicate returned a prediction without an ID.");
  }

  while (
    prediction.status === "starting" ||
    prediction.status === "processing"
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    response = await fetch(
      `https://api.replicate.com/v1/predictions/${encodeURIComponent(prediction.id)}`,
      {
        headers: {
          ...headers,
          Prefer: "wait=10",
        },
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Replicate prediction polling failed (${response.status}): ${await response.text()}`,
      );
    }

    prediction = (await response.json()) as ReplicatePrediction;

    if (!prediction.id) {
      throw new Error("Replicate returned a prediction without an ID.");
    }
  }

  if (!["succeeded", "failed", "canceled"].includes(prediction.status)) {
    throw new Error("Replicate returned an invalid prediction status.");
  }

  if (prediction.status !== "succeeded") {
    throw new Error(
      prediction.error ||
        `Replicate prediction ended with status "${prediction.status}".`,
    );
  }

  if (!prediction.output) {
    throw new Error("Replicate completed without returning an image URL.");
  }

  const outputUrl = new URL(prediction.output);

  if (outputUrl.protocol !== "https:") {
    throw new Error("Replicate returned an invalid image URL.");
  }

  const imageResponse = await fetch(outputUrl, { signal });

  if (!imageResponse.ok) {
    throw new Error(
      `Could not download the generated image (${imageResponse.status}).`,
    );
  }

  const image = await imageResponse.blob();

  if (!image.type.startsWith("image/") || image.size === 0) {
    throw new Error("Replicate returned an invalid or empty image.");
  }

  return image;
}

function getFileExtension(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    /*
     * ---------------------------------------------------------
     * 1. Authenticate the current user
     * ---------------------------------------------------------
     */

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in to use AI Virtual Staging.",
        },
        { status: 401 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 2. Check environment variable
     * ---------------------------------------------------------
     */

    const replicateToken = process.env.REPLICATE_API_TOKEN;

    if (!replicateToken) {
      console.error("REPLICATE_API_TOKEN is missing from environment variables.");

      return NextResponse.json(
        {
          error:
            "Virtual staging is temporarily unavailable. Please try again later.",
        },
        { status: 500 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 3. Read request
     * ---------------------------------------------------------
     */

    const body = await request.json();

    const propertyId = body.propertyId as string | undefined;
    const imageUrl = body.imageUrl as string | undefined;
    const designStyle = body.designStyle as string | undefined;

    if (!propertyId || !imageUrl || !designStyle) {
      return NextResponse.json(
        {
          error:
            "propertyId, imageUrl and designStyle are required.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 4. Verify that the property belongs to the current user
     * ---------------------------------------------------------
     */

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("User profile lookup error:", profileError);

      return NextResponse.json(
        {
          error: "Unable to verify your account.",
        },
        { status: 500 }
      );
    }

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, owner_id, title")
      .eq("id", propertyId)
      .maybeSingle();

    if (propertyError) {
      console.error("Property lookup error:", propertyError);

      return NextResponse.json(
        {
          error: "Unable to verify the property.",
        },
        { status: 500 }
      );
    }

    if (!property) {
      return NextResponse.json(
        {
          error: "Property not found.",
        },
        { status: 404 }
      );
    }

    // AI virtual staging is a house-hunter feature.
// Any authenticated user may visualize a public property.
// The property is still checked to ensure it exists.

    /*
     * ---------------------------------------------------------
     * 5. Download the original property image
     * ---------------------------------------------------------
     */

    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      return NextResponse.json(
        {
          error: "Could not download the selected property image.",
        },
        { status: 400 }
      );
    }

    const imageBlob = await imageResponse.blob();

    if (!imageBlob.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error: "The selected URL is not a valid image.",
        },
        { status: 400 }
      );
    }

    /*
     * Keep the original image reasonably small.
     * This prevents unnecessarily large requests.
     */

    const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

    if (imageBlob.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          error:
            "The selected image is too large. Please use an image smaller than 15 MB.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 6. Build the staging prompt
     * ---------------------------------------------------------
     */

    const styleDescription = getStylePrompt(designStyle);

    const prompt = `
You are an AI virtual staging assistant for a Kenyan real-estate
platform called KejaTrue.

Edit the supplied property photograph to virtually stage the room.

DESIGN STYLE:
${styleDescription}

IMPORTANT PRESERVATION RULES:

- Preserve the exact room architecture.
- Preserve the walls and their positions.
- Preserve windows and doors.
- Preserve the ceiling structure.
- Preserve the floor.
- Preserve the camera perspective.
- Preserve the room dimensions and proportions.
- Do not add windows or doors that do not exist.
- Do not remove structural features.
- Do not change the property's location or architecture.
- Do not create unrealistic room extensions.
- Do not alter the photograph into a completely different room.

The purpose is to show a realistic example of how the existing room
could look when furnished and decorated.

Add realistic furniture and tasteful interior decorations appropriate
for the existing room.

The result should look like a professional real-estate virtual
staging photograph rather than an illustration.

Do not add people.

Do not add text, logos, watermarks or signs.

Maintain realistic lighting, shadows, materials and perspective.
`;

    /*
     * ---------------------------------------------------------
     * 7. Call Replicate
     * ---------------------------------------------------------
     */

    let generatedImage: Blob;

    try {
      generatedImage = await generateStagedImage(
        replicateToken,
        imageUrl,
        prompt,
      );
    } catch (aiError) {
      console.error("Replicate image generation error:", aiError);

      const errorMessage =
        aiError instanceof Error
          ? aiError.message
          : "The AI image generation request failed.";

      /*
       * Record failed generation attempt.
       */

      await supabase.from("ai_redesigns").insert({
        user_id: user.id,
        property_id: propertyId,
        original_image: imageUrl,
        generated_image: null,
        design_style: designStyle,
        prompt,
        status: "failed",
        error_message: errorMessage,
      });

      return NextResponse.json(
        {
          error:
            "We couldn't create this visualisation right now. Please try again shortly.",
        },
        { status: 502 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 8. Convert generated image to ArrayBuffer
     * ---------------------------------------------------------
     */

    const generatedBuffer = await generatedImage.arrayBuffer();

    if (!generatedBuffer.byteLength) {
      return NextResponse.json(
        {
          error: "The AI returned an empty image.",
        },
        { status: 502 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 9. Upload generated image to Supabase Storage
     * ---------------------------------------------------------
     */

    const generatedContentType =
      generatedImage.type || "image/jpeg";

    const extension = getFileExtension(generatedContentType);

    const storagePath =
      `ai-staging/${user.id}/${propertyId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("property-images")
      .upload(storagePath, generatedBuffer, {
        contentType: generatedContentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("AI image storage error:", uploadError);

      return NextResponse.json(
        {
          error:
            "The AI generated the image, but KejaTrue could not save it.",
        },
        { status: 500 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 10. Get public URL
     * ---------------------------------------------------------
     */

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("property-images")
      .getPublicUrl(storagePath);

    /*
     * ---------------------------------------------------------
     * 11. Save generation record
     * ---------------------------------------------------------
     */

    const { data: redesign, error: redesignError } = await supabase
      .from("ai_redesigns")
      .insert({
        user_id: user.id,
        property_id: propertyId,
        original_image: imageUrl,
        generated_image: publicUrl,
        design_style: designStyle,
        prompt,
        status: "completed",
        error_message: null,
      })
      .select(
        "id, property_id, original_image, generated_image, design_style, prompt, status, created_at"
      )
      .single();

    if (redesignError) {
      console.error(
        "AI redesign database error:",
        redesignError
      );

      /*
       * Clean up the generated file if the database insert failed.
       */

      await supabase.storage
        .from("property-images")
        .remove([storagePath]);

      return NextResponse.json(
        {
          error:
            "The AI generated the image, but KejaTrue could not save the redesign record.",
        },
        { status: 500 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 12. Return result to frontend
     * ---------------------------------------------------------
     */

    return NextResponse.json({
      success: true,
      generatedImage: publicUrl,
      redesign,
    });
  } catch (error) {
    console.error("AI redesign route error:", error);

    return NextResponse.json(
      {
        error:
          "We couldn't complete the visualisation right now. Please try again shortly.",
      },
      { status: 500 }
    );
  }
}