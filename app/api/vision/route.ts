import { NextRequest, NextResponse } from "next/server";

// Google Cloud Vision API implementation
// Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account JSON key file path
// Or use the Google Cloud client library with explicit credentials

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    // Decode base64 image
    const imageBuffer = Buffer.from(image, "base64");

    // Try to use Google Cloud Vision API if available
    try {
      // Dynamic import to avoid errors if package isn't installed
      const vision = await import("@google-cloud/vision");
      const client = new vision.v1.ImageAnnotatorClient();

      const [result] = await client.textDetection({
        image: { content: imageBuffer },
      });

      const detections = result.textAnnotations || [];

      // Google Vision API returns the full text as the first element,
      // followed by individual word/line detections
      // We'll return all of them, but the first one contains the complete text
      return NextResponse.json({
        textAnnotations: detections.map((detection: any) => ({
          text: detection.description || "",
          confidence: detection.confidence || 0,
        })),
      });
    } catch (visionError: any) {
      // If Google Cloud Vision is not set up, fall back to a basic OCR attempt
      // or return an error message
      if (visionError.code === "MODULE_NOT_FOUND") {
        return NextResponse.json(
          {
            error:
              "Google Cloud Vision API not installed. Run: npm install @google-cloud/vision",
            textAnnotations: [],
          },
          { status: 500 }
        );
      }

      // If credentials are missing
      if (
        visionError.message?.includes("credentials") ||
        visionError.code === 7
      ) {
        return NextResponse.json(
          {
            error:
              "Google Cloud Vision API credentials not configured. Please set GOOGLE_APPLICATION_CREDENTIALS environment variable.",
            textAnnotations: [],
          },
          { status: 500 }
        );
      }

      throw visionError;
    }
  } catch (error) {
    console.error("Error in vision API:", error);
    return NextResponse.json(
      { error: "Failed to process image", textAnnotations: [] },
      { status: 500 }
    );
  }
}
