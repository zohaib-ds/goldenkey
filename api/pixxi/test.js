export default async function handler(req, res) {
  try {
    const token = process.env.PIXXI_API_TOKEN;

    if (!token) {
      return res.status(500).json({
        success: false,
        error: "PIXXI_API_TOKEN is not configured",
      });
    }

    const response = await fetch(
      "https://dataapi.pixxicrm.ae/pixxiapi/v1/properties",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PIXXI-TOKEN": token,
        },
        body: JSON.stringify({
          listingType: "SELL",
          page: 1,
          size: 5,
        }),
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return res.status(response.status).json({
      success: response.ok,
      status: response.status,
      data,
    });
  } catch (error) {
    console.error("Pixxi test error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}