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

    // Extra form fields (page/source, interest, budget, etc.) are
    // appended to the message so they reach the CRM instead of
    // being dropped. If none are sent, the message is unchanged.
    const extraLines = [
      body.source && `Source: ${body.source}`,
      body.propertyType && `Interested in: ${body.propertyType}`,
      body.budget && `Budget: ${body.budget}`,
      body.preferredSize && `Preferred size: ${body.preferredSize}`,
      body.nationality && `Nationality: ${body.nationality}`,
      body.propertyReference && `Property reference: ${body.propertyReference}`,
      body.details,
    ].filter(Boolean);

    const message = [body.message, extraLines.join("\n")]
      .filter(Boolean)
      .join("\n\n");

    const payload = {
      formName: "GK Website",
      formId,

      name: body.name || "",
      email: body.email || "",
      phone: body.phone || "",

      message,
    };

    const response = await fetch(
      "https://dataapi.pixxicrm.ae/pixxiapi/webhook/v1/form",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "X-PIXXI-TOKEN": token,
        },

        body: JSON.stringify(payload),
      }
    );

    const rawText = await response.text();

    let pixxiData = null;

    try {
      pixxiData = rawText
        ? JSON.parse(rawText)
        : null;
    } catch {
      pixxiData = rawText;
    }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error:
          pixxiData?.message ||
          pixxiData?.msg ||
          "Pixxi rejected the enquiry.",
        pixxi: pixxiData,
      });
    }

    return res.status(200).json({
      success: true,
      status: response.status,
      message: "Lead submitted successfully.",
      pixxi: pixxiData,
    });

  } catch (error) {
    console.error(
      "Pixxi lead error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}