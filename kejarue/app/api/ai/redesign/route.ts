import { NextRequest, NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";
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

function getStylePrompt(style: string) {
  return STAGING_STYLES[style] ?? STAGING_STYLES.modern;
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

    const hfToken = process.env.HF_TOKEN;

    if (!hfToken) {
      console.error("HF_TOKEN is missing from environment variables.");

      return NextResponse.json(
        {
          error:
            "Hugging Face is not configured. Add HF_TOKEN to .env.local.",
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

    if (property.owner_id !== user.id && property.owner_id !== profile?.id) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to create a redesign for this property.",
        },
        { status: 403 }
      );
    }

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
     * 7. Call Hugging Face
     * ---------------------------------------------------------
     */

    const hf = new InferenceClient(hfToken);

    let generatedImage: Blob;

    try {
      generatedImage = await hf.imageToImage({
        inputs: imageBlob,
        model: "black-forest-labs/FLUX.1-Kontext-dev",
        provider: "fal-ai",
        parameters: { prompt },
      });
    } catch (aiError) {
      console.error("Hugging Face image generation error:", aiError);

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
            "AI image generation failed. Your Hugging Face free inference allowance may be exhausted, or the selected model may currently be unavailable.",
          details: errorMessage,
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
          error instanceof Error
            ? error.message
            : "Something went wrong while creating the AI redesign.",
      },
      { status: 500 }
    );
  }
}