export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const token = process.env.PIXXI_API_TOKEN;
    const formId = process.env.PIXXI_FORM_ID;

    if (!token) {
      return res.status(500).json({
        success: false,
        error: "PIXXI_API_TOKEN is missing",
      });
    }

    if (!formId) {
      return res.status(500).json({
        success: false,
        error: "PIXXI_FORM_ID is missing",
      });
    }

    const body = req.body || {};

    const payload = {
      formId,
      name: body.name || "",
      email: body.email || "",
      phone: body.phone || "",
      nationality: body.nationality || "",
      budget: body.budget || "",
      preferredSize: body.preferredSize || "",
      propertyType: body.propertyType || "",
      message: body.message || "",
      propertyReference:
        body.propertyReference || "",
    };

    console.log("PIXXI LEAD REQUEST:", {
      ...payload,
      // Do not log token
    });

    const response = await fetch(
      "https://dataapi.pixxicrm.ae/pixxiapi/v1/leads",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-PIXXI-TOKEN": token,
        },
        body: JSON.stringify(payload),
      }
    );

    const rawText = await response.text();

    let pixxiData = null;

    if (rawText.trim()) {
      try {
        pixxiData = JSON.parse(rawText);
      } catch {
        pixxiData = {
          raw: rawText,
        };
      }
    }

    console.log("PIXXI LEAD RESPONSE:", {
      status: response.status,
      data: pixxiData,
    });

    // Pixxi returned an HTTP error
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        status: response.status,
        error:
          pixxiData?.message ||
          pixxiData?.error ||
          "Pixxi rejected the lead.",
        pixxi: pixxiData,
      });
    }

    /*
      IMPORTANT:
      Do not blindly assume any 200 response means the
      lead was created. Return the raw Pixxi response
      so we can verify the exact response structure.
    */
    return res.status(200).json({
      success: true,
      status: response.status,
      pixxi: pixxiData,
      rawResponse: rawText || null,
    });
  } catch (error) {
    console.error(
      "Pixxi lead endpoint error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}