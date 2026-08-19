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
      formName: "GK Website",
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

    console.log("PIXXI FORM PAYLOAD:", payload);

    const response = await fetch(
      "https://dataapi.pixxicrm.ae/pixxiapi/webhook/v1/form",
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

    console.log("PIXXI FORM RESPONSE:", {
      status: response.status,
      data: pixxiData,
    });

    const pixxiFailed =
      !response.ok ||
      pixxiData?.code >= 400 ||
      pixxiData?.statusCode >= 400;

    if (pixxiFailed) {
      return res.status(502).json({
        success: false,

        status: response.status,

        error:
          pixxiData?.message ||
          pixxiData?.msg ||
          pixxiData?.error ||
          "Pixxi rejected the form.",

        pixxi: pixxiData,
      });
    }

    return res.status(200).json({
      success: true,
      status: response.status,
      pixxi: pixxiData,
      rawResponse: rawText || null,
    });

  } catch (error) {
    console.error(
      "Pixxi form endpoint error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}