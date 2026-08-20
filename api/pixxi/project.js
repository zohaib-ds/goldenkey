export default async function handler(req, res) {
  try {
    const token =
      process.env.PIXXI_API_TOKEN;

    if (!token) {
      return res.status(500).json({
        success: false,
        error:
          "PIXXI_API_TOKEN is missing",
      });
    }

    const propertyId =
      req.query?.id;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error:
          "Project ID is required",
      });
    }

    const response = await fetch(
      `https://dataapi.pixxicrm.ae/pixxiapi/v1/${encodeURIComponent(
        propertyId
      )}`,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",
          "X-PIXXI-TOKEN":
            token,
        },
      }
    );

    const text =
      await response.text();

    let data;

    try {
      data = text
        ? JSON.parse(text)
        : {};
    } catch {
      data = {
        raw: text,
      };
    }

    if (!response.ok) {
      return res
        .status(response.status)
        .json({
          success: false,
          error:
            data?.message ||
            "Could not load project",
          pixxi: data,
        });
    }

    return res.status(200).json({
      success: true,
      project:
        data?.data ||
        data?.property ||
        data,
    });

  } catch (error) {
    console.error(
      "Pixxi project error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}