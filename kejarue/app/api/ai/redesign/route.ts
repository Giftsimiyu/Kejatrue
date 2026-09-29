import { NextResponse } from "next/server";
import { createClient } from "../../../backend/supabase/server";

const STYLE_PROMPTS: Record<string, string> = {
  modern:
    "modern contemporary interior design, clean lines, elegant furniture, balanced neutral palette",

  minimalist:
    "minimalist interior design, uncluttered space, simple elegant furniture, neutral colors, functional layout",

  scandinavian:
    "Scandinavian interior design, light natural wood, soft neutral colors, cozy textiles, bright airy atmosphere",

  bohemian:
    "bohemian interior design, layered textiles, plants, natural materials, artistic decor, warm earthy tones",

  luxury:
    "luxury interior design, sophisticated furniture, premium materials, elegant lighting, refined finishes",

  "warm-cozy":
    "warm cozy interior design, comfortable furniture, soft lighting, warm neutral colors, inviting atmosphere",

  contemporary:
    "contemporary interior design, refined modern furniture, sophisticated materials, balanced proportions",

  industrial:
    "industrial interior design, exposed materials, metal accents, wood, urban furniture, sophisticated industrial style",
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be signed in to use AI virtual staging.",
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    const propertyId = String(body.propertyId ?? "");
    const imageUrl = String(body.imageUrl ?? "");
    const designStyle = String(body.designStyle ?? "");

    if (!propertyId || !imageUrl || !designStyle) {
      return NextResponse.json(
        {
          error:
            "Property, image and design style are required.",
        },
        { status: 400 },
      );
    }

    const stylePrompt = STYLE_PROMPTS[designStyle];

    if (!stylePrompt) {
      return NextResponse.json(
        {
          error: "The selected design style is not supported.",
        },
        { status: 400 },
      );
    }

    /*
     * Make sure the property exists before spending an AI request.
     */
    const { data: property, error: propertyError } =
      await supabase
        .from("properties")
        .select("id,title")
        .eq("id", propertyId)
        .maybeSingle();

    if (propertyError || !property) {
      return NextResponse.json(
        {
          error: "Property not found.",
        },
        { status: 404 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "AI staging is not configured yet. Add OPENAI_API_KEY to your environment variables.",
        },
        { status: 503 },
      );
    }

    const prompt = `
You are an expert real-estate virtual staging assistant.

Redesign the interior shown in the supplied property photograph.

Interior style:
${stylePrompt}

IMPORTANT:
- Keep the room's architecture unchanged.
- Keep the walls, windows, doors, floor plan and room proportions unchanged.
- Do not add or remove windows or doors.
- Preserve the camera perspective.
- Add realistic furniture and interior decoration.
- Make the result look like a professional real-estate photograph.
- Do not change the property's structural features.
- Do not invent another room.
- Do not add people.
- Do not add text, logos or watermarks.

The result should look like the SAME ROOM professionally staged in the requested style.
`.trim();

    /*
     * Fetch the original property image.
     */
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      return NextResponse.json(
        {
          error:
            "The property image could not be downloaded for AI editing.",
        },
        { status: 400 },
      );
    }

    const imageBuffer = Buffer.from(
      await imageResponse.arrayBuffer(),
    );

    /*
     * OpenAI image editing endpoint.
     *
     * The exact image model/API configuration can be changed
     * here without changing the frontend.
     */
    const formData = new FormData();

    formData.append(
      "model",
      "gpt-image-1",
    );

    formData.append(
      "prompt",
      prompt,
    );

    formData.append(
      "size",
      "1536x1024",
    );

    formData.append(
      "quality",
      "medium",
    );

    formData.append(
      "image",
      new Blob([imageBuffer], {
        type:
          imageResponse.headers.get(
            "content-type",
          ) || "image/jpeg",
      }),
      "property.jpg",
    );

    const aiResponse = await fetch(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      },
    );

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error(
        "AI image generation failed:",
        aiData,
      );

      return NextResponse.json(
        {
          error:
            aiData?.error?.message ||
            "The AI could not generate the redesign.",
        },
        { status: 500 },
      );
    }

    const generatedBase64 =
      aiData?.data?.[0]?.b64_json;

    if (!generatedBase64) {
      return NextResponse.json(
        {
          error:
            "The AI response did not contain a generated image.",
        },
        { status: 500 },
      );
    }

    const generatedBuffer = Buffer.from(
      generatedBase64,
      "base64",
    );

    /*
     * Store the generated image in Supabase Storage.
     */
    const storagePath =
      `ai-redesigns/${user.id}/${propertyId}/${Date.now()}.png`;

    const { error: uploadError } =
      await supabase.storage
        .from("property-images")
        .upload(
          storagePath,
          generatedBuffer,
          {
            contentType: "image/png",
            upsert: false,
          },
        );

    if (uploadError) {
      console.error(
        "Generated image upload failed:",
        uploadError,
      );

      return NextResponse.json(
        {
          error:
            "The AI generated the image, but KejaTrue could not save it.",
        },
        { status: 500 },
      );
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("property-images")
      .getPublicUrl(storagePath);

    const generatedImage =
      publicUrlData.publicUrl;

    /*
     * Save the redesign record.
     */
    const { error: redesignError } =
      await supabase
        .from("ai_redesigns")
        .insert({
          user_id: user.id,
          property_id: propertyId,
          original_image: imageUrl,
          generated_image: generatedImage,
          design_style: designStyle,
          prompt,
          status: "completed",
        });

    if (redesignError) {
      console.error(
        "Redesign record failed:",
        redesignError,
      );
    }

    return NextResponse.json({
      success: true,
      generatedImage,
      style: designStyle,
    });
  } catch (error) {
    console.error(
      "AI redesign route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating the virtual staging.",
      },
      { status: 500 },
    );
  }
}