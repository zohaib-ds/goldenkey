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

    const {
      name = "",
      email = "",
      phone = "",
      message = "",
      propertyReference = "",
      budget = "",
      preferredSize = "",
      propertyType = "",
      nationality = "",
    } = req.body || {};

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        error: "Name, email and phone are required",
      });
    }

    const payload = {
      formId,
      propertyReference,
      name,
      email,
      phone,
      nationality,
      budget,
      preferredSize,
      propertyType,
      message,
    };

    const response = await fetch(
      "https://dataapi.pixxicrm.ae/pixxiapi/v1/leads",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PIXXI-TOKEN": token,
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return res.status(response.status).json({
      success: response.ok,
      data,
    });
  } catch (error) {
    console.error("Pixxi lead error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}